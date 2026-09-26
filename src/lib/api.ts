import type {
  ApiErrorBody,
  ApiSuccess,
  DocumentFormat,
  EventDetail,
  EventDocKind,
  EventItem,
  AvailableExam,
  ClassMember,
  ClassRoom,
  Exam,
  ExamDetail,
  ActiveExamSummary,
  ExamListItem,
  ExamMonitoring,
  ExamResults,
  ImportSummary,
  MySession,
  Question,
  QuestionBank,
  SessionDetail,
  SessionResult,
  StartExamResult,
  User,
} from '../types';

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://127.0.0.1:3000/api';

const ACCESS_KEY = 'cbt.accessToken';
const REFRESH_KEY = 'cbt.refreshToken';
const USER_KEY = 'cbt.user';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  getUser: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  set(auth: { accessToken: string; refreshToken: string; user?: User }) {
    localStorage.setItem(ACCESS_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
    if (auth.user) localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiRequestError extends Error {
  status: number;
  fields?: { path: string; message: string }[];
  constructor(status: number, message: string, fields?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ApiSuccess<{ accessToken: string; refreshToken: string }>;
    tokenStore.set({
      accessToken: body.data!.accessToken,
      refreshToken: body.data!.refreshToken,
    });
    return body.data!.accessToken;
  } catch {
    return null;
  }
}

/**
 * Fetch dengan header auth; bila access token kedaluwarsa (401),
 * refresh token diperbarui sekali lalu request diulang.
 * Dipakai bersama oleh request JSON dan download file.
 */
async function fetchWithRefresh(url: string, init: RequestInit, skipAuth = false): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokenStore.getAccess();
  if (!skipAuth && token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401 && !skipAuth) {
    if (!refreshing) {
      refreshing = doRefresh().finally(() => {
        refreshing = null;
      });
    }
    const newToken = await refreshing;
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...init, headers });
    } else {
      tokenStore.clear();
      if (!location.pathname.startsWith('/login')) {
        location.assign('/login');
      }
      throw new ApiRequestError(401, 'Sesi berakhir, silakan masuk kembali');
    }
  }
  return res;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { method = 'GET', body, query, skipAuth } = opts;

  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetchWithRefresh(
    url.toString(),
    {
      method,
      headers,
      body: body !== undefined ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    },
    skipAuth,
  );

  let json: ApiSuccess<T> | ApiErrorBody;
  try {
    json = (await res.json()) as ApiSuccess<T> | ApiErrorBody;
  } catch {
    throw new ApiRequestError(res.status, `Server error (${res.status})`);
  }

  if (!res.ok || !json.success) {
    const err = json as ApiErrorBody;
    throw new ApiRequestError(res.status, err.message ?? 'Terjadi kesalahan', err.errors);
  }
  return json as ApiSuccess<T>;
}

/** Unduh file dari endpoint terproteksi (dengan auth + auto refresh token) sebagai blob */
export async function downloadFile(path: string): Promise<{ blob: Blob; filename: string }> {
  const res = await fetchWithRefresh(`${API_BASE}${path}`, { method: 'GET' });

  if (!res.ok) {
    let message = `Gagal mengunduh file (${res.status})`;
    try {
      const err = (await res.json()) as ApiErrorBody;
      if (err.message) message = err.message;
    } catch {
      /* respons bukan JSON */
    }
    throw new ApiRequestError(res.status, message);
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  return {
    blob: await res.blob(),
    filename: match?.[1] ?? 'download',
  };
}

/** Picu unduhan blob ke perangkat pengguna */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  // Auth
  // identifier: email (admin/guru) atau NISN/NIS (siswa)
  signIn: (body: { identifier: string; password: string }) =>
    request<{ user: User; accessToken: string; refreshToken: string }>('/auth/signin', {
      method: 'POST',
      body,
      skipAuth: true,
    }),
  signOut: (refreshToken: string) =>
    request('/auth/logout', { method: 'POST', body: { refreshToken }, skipAuth: true }),
  me: () => request<User>('/auth/me'),

  // Users
  listUsers: (query?: { page?: number; limit?: number; search?: string; role?: string }) =>
    request<User[]>('/users', { query }),
  createUser: (body: {
    name: string;
    email?: string;
    nis?: string;
    nisn?: string;
    password: string;
    role: string;
  }) => request<User>('/users', { method: 'POST', body }),
  deleteUser: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),

  // Kelas
  listClasses: (query?: { page?: number; limit?: number; search?: string; grade?: string }) =>
    request<ClassRoom[]>('/classes', { query }),
  createClass: (body: { name: string; grade?: string; jurusan?: string; description?: string }) =>
    request<ClassRoom>('/classes', { method: 'POST', body }),
  updateClass: (
    id: number,
    body: { name?: string; grade?: string; jurusan?: string; description?: string },
  ) => request<ClassRoom>(`/classes/${id}`, { method: 'PATCH', body }),
  deleteClass: (id: number) => request(`/classes/${id}`, { method: 'DELETE' }),
  listClassMembers: (id: number) => request<ClassMember[]>(`/classes/${id}/students`),
  addClassMembers: (id: number, studentIds: number[]) =>
    request<{ added: number }>(`/classes/${id}/students`, { method: 'POST', body: { studentIds } }),
  removeClassMember: (id: number, studentId: number) =>
    request(`/classes/${id}/students/${studentId}`, { method: 'DELETE' }),

  // Import Excel
  importUsers: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ImportSummary>('/imports/users', { method: 'POST', body: form });
  },
  importClasses: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ImportSummary>('/imports/classes', { method: 'POST', body: form });
  },
  importClassStudents: (classId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ImportSummary>(`/imports/class-students/${classId}`, {
      method: 'POST',
      body: form,
    });
  },
  downloadUsersTemplate: () => downloadFile('/imports/users/template'),
  downloadClassesTemplate: () => downloadFile('/imports/classes/template'),
  downloadClassStudentsTemplate: () => downloadFile('/imports/class-students/template'),
  downloadQuestionsTemplate: () => downloadFile('/imports/bank-questions/template'),
  importQuestionsDocx: (bankId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ImportSummary>(`/imports/bank-questions/${bankId}`, {
      method: 'POST',
      body: form,
    });
  },

  // Event ujian
  listEvents: () => request<EventItem[]>('/events'),
  getEvent: (id: number) => request<EventDetail>(`/events/${id}`),
  createEvent: (body: Record<string, unknown>) =>
    request<EventItem>('/events', { method: 'POST', body }),
  updateEvent: (id: number, body: Record<string, unknown>) =>
    request<EventItem>(`/events/${id}`, { method: 'PATCH', body }),
  deleteEvent: (id: number) => request(`/events/${id}`, { method: 'DELETE' }),
  uploadEventLogo: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ logo: string }>(`/events/${id}/logo`, { method: 'POST', body: form });
  },
  removeEventLogo: (id: number) => request<{ logo: null }>(`/events/${id}/logo`, { method: 'DELETE' }),
  downloadEventDoc: (
    id: number,
    kind: EventDocKind,
    classId?: number,
    format: DocumentFormat = 'pdf',
  ) => {
    const params = new URLSearchParams();
    if (classId) params.set('classId', String(classId));
    params.set('format', format);
    return downloadFile(`/events/${id}/documents/${kind}?${params.toString()}`);
  },

  // Backup (admin)
  downloadBackup: () => downloadFile('/backup'),
  restoreBackup: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Record<string, number>>('/backup/restore', { method: 'POST', body: form });
  },

  // Bank soal
  listBanks: (query?: { page?: number; limit?: number; search?: string }) =>
    request<QuestionBank[]>('/banks', { query }),
  createBank: (body: { name: string; subject?: string; description?: string }) =>
    request<QuestionBank>('/banks', { method: 'POST', body }),
  updateBank: (id: number, body: { name?: string; subject?: string; description?: string }) =>
    request<QuestionBank>(`/banks/${id}`, { method: 'PATCH', body }),
  deleteBank: (id: number) => request(`/banks/${id}`, { method: 'DELETE' }),
  listQuestions: (bankId: number) => request<Question[]>(`/banks/${bankId}/questions`),
  createQuestion: (
    bankId: number,
    body: {
      type: string;
      questionText: string;
      points: number;
      options?: string[];
      correctAnswer: string | number;
    },
  ) => request<Question>(`/banks/${bankId}/questions`, { method: 'POST', body }),
  updateQuestion: (
    bankId: number,
    questionId: number,
    body: {
      type: string;
      questionText: string;
      points: number;
      options?: string[];
      correctAnswer: string | number;
    },
  ) => request<Question>(`/banks/${bankId}/questions/${questionId}`, { method: 'PATCH', body }),
  deleteQuestion: (bankId: number, questionId: number) =>
    request(`/banks/${bankId}/questions/${questionId}`, { method: 'DELETE' }),

  // Ujian
  listExams: (query?: { page?: number; limit?: number; search?: string }) =>
    request<ExamListItem[]>('/exams', { query }),
  getExam: (id: number) => request<ExamDetail>(`/exams/${id}`),
  createExam: (body: Record<string, unknown>) => request<Exam>('/exams', { method: 'POST', body }),
  updateExam: (id: number, body: Record<string, unknown>) =>
    request<Exam>(`/exams/${id}`, { method: 'PATCH', body }),
  deleteExam: (id: number, force = false) =>
    request(`/exams/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  regenerateToken: (id: number) =>
    request<{ token: string }>(`/exams/${id}/regenerate-token`, { method: 'POST' }),
  examResults: (id: number) => request<ExamResults>(`/exams/${id}/results`),
  examMonitoring: (id: number) => request<ExamMonitoring>(`/exams/${id}/monitoring`),
  activeExamSummary: () => request<ActiveExamSummary[]>('/exams/active-summary'),

  // Siswa
  availableExams: () => request<AvailableExam[]>('/exams/available'),
  startExam: (examId: number, token: string) =>
    request<StartExamResult>(`/exams/${examId}/start`, { method: 'POST', body: { token } }),
  mySessions: (query?: { page?: number; limit?: number }) =>
    request<MySession[]>('/sessions/mine', { query }),
  sessionDetail: (id: number) => request<SessionDetail>(`/sessions/${id}`),
  submitAnswer: (sessionId: number, questionId: number, answer: string) =>
    request<{ questionId: number; answer: string; answeredAt: string }>(
      `/sessions/${sessionId}/answers`,
      { method: 'POST', body: { questionId, answer } },
    ),
  resetSession: (sessionId: number) =>
    request<{ examId: number; studentId: number }>(`/sessions/${sessionId}/reset`, {
      method: 'POST',
    }),
  forceFinishSession: (sessionId: number) =>
    request<{ sessionId: number; status: string; score: number }>(
      `/sessions/${sessionId}/force-finish`,
      { method: 'POST' },
    ),
  setFlag: (sessionId: number, questionId: number, flagged: boolean) =>
    request<{ flags: number[] }>(`/sessions/${sessionId}/flags`, {
      method: 'POST',
      body: { questionId, flagged },
    }),
  finishSession: (sessionId: number) =>
    request<{
      sessionId: number;
      status: string;
      score: number;
      totalPoints: number;
      answeredCount: number;
      totalQuestions: number;
    }>(`/sessions/${sessionId}/finish`, { method: 'POST' }),
  sessionResult: (sessionId: number) => request<SessionResult>(`/sessions/${sessionId}/result`),
};
