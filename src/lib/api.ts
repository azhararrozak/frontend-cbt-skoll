import type {
  ApiErrorBody,
  ApiSuccess,
  AvailableExam,
  ClassMember,
  ClassRoom,
  Exam,
  ExamDetail,
  ExamListItem,
  ExamResults,
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

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
  raw?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { method = 'GET', body, query, skipAuth } = opts;

  const url = new URL(`${API_BASE}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.getAccess();
  if (!skipAuth && token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Access token kadaluarsa -> refresh sekali lalu ulangi request
  if (res.status === 401 && !skipAuth) {
    if (!refreshing) {
      refreshing = doRefresh().finally(() => {
        refreshing = null;
      });
    }
    const newToken = await refreshing;
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      tokenStore.clear();
      if (!location.pathname.startsWith('/login')) {
        location.assign('/login');
      }
      throw new ApiRequestError(401, 'Sesi berakhir, silakan masuk kembali');
    }
  }

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

export const api = {
  // Auth
  signUp: (body: { name: string; email: string; password: string }) =>
    request<{ user: User; accessToken: string; refreshToken: string }>('/auth/signup', {
      method: 'POST',
      body,
      skipAuth: true,
    }),
  signIn: (body: { email: string; password: string }) =>
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
  createUser: (body: { name: string; email: string; password: string; role: string }) =>
    request<User>('/users', { method: 'POST', body }),
  deleteUser: (id: number) => request(`/users/${id}`, { method: 'DELETE' }),

  // Kelas
  listClasses: (query?: { page?: number; limit?: number; search?: string }) =>
    request<ClassRoom[]>('/classes', { query }),
  createClass: (body: { name: string; description?: string }) =>
    request<ClassRoom>('/classes', { method: 'POST', body }),
  deleteClass: (id: number) => request(`/classes/${id}`, { method: 'DELETE' }),
  listClassMembers: (id: number) => request<ClassMember[]>(`/classes/${id}/students`),
  addClassMembers: (id: number, studentIds: number[]) =>
    request<{ added: number }>(`/classes/${id}/students`, { method: 'POST', body: { studentIds } }),
  removeClassMember: (id: number, studentId: number) =>
    request(`/classes/${id}/students/${studentId}`, { method: 'DELETE' }),

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
  deleteExam: (id: number) => request(`/exams/${id}`, { method: 'DELETE' }),
  regenerateToken: (id: number) =>
    request<{ token: string }>(`/exams/${id}/regenerate-token`, { method: 'POST' }),
  examResults: (id: number) => request<ExamResults>(`/exams/${id}/results`),

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
