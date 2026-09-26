export type UserRole = 'admin' | 'guru' | 'siswa';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface User {
  id: number;
  name: string;
  email: string;
  /** NIS: nomor induk sekolah (identitas internal) */
  nis: string | null;
  /** NISN: identitas utama siswa (null untuk guru/admin) */
  nisn: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data?: T;
  pagination?: Pagination;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: { path: string; message: string }[];
}

// ===== Bank Soal =====
export interface QuestionBank {
  id: number;
  name: string;
  subject: string | null;
  description: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
}

export interface Question {
  id: number;
  bankId: number;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// ===== Kelas =====
export interface ClassRoom {
  id: number;
  name: string;
  grade: string;
  jurusan: string;
  description: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  studentCount?: number;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportSummary {
  created: number;
  skipped: number;
  errors: ImportRowError[];
  classesCreated?: number;
  /** Import siswa per kelas: siswa lama yang baru digabung ke kelas */
  linked?: number;
}

export interface ClassMember {
  id: number;
  name: string;
  email: string;
  nis: string | null;
  nisn: string | null;
  role: UserRole;
}

// ===== Ujian =====
export interface Exam {
  id: number;
  title: string;
  description: string | null;
  bankId: number;
  token: string;
  durationMinutes: number;
  /** Siswa boleh menyelesaikan ujian setelah menit ke-N (0 = bebas) */
  minSubmitMinutes: number;
  /** Tampilkan nilai ke siswa setelah selesai? */
  showScore: boolean;
  /** Acak urutan soal untuk tiap siswa? */
  shuffleQuestions: boolean;
  startAt: string | null;
  endAt: string | null;
  isPublished: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamListItem extends Exam {
  bankName: string | null;
  classNames: string;
  classIds: number[];
  sessionCount: number;
}

export interface ExamDetail extends Exam {
  bankName: string | null;
  classNames: string;
  classIds: number[];
  totalQuestions: number;
}

export type ExamAvailability = 'open' | 'upcoming' | 'ended';

export interface AvailableExam {
  exam: Exam;
  bankName: string | null;
  classNames: string;
  availability: ExamAvailability;
  mySession: {
    id: number;
    status: 'in_progress' | 'completed';
    score: number;
    expiresAt: string;
  } | null;
}

export interface StartExamResult {
  sessionId: number;
  status: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  totalQuestions: number;
  resumed: boolean;
}

export interface ExamResultRow {
  sessionId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  status: string;
  score: number;
  startedAt: string;
  expiresAt: string;
  finishedAt: string | null;
}

export interface ExamResults {
  exam: Exam;
  totalQuestions: number;
  totalPoints: number;
  rows: ExamResultRow[];
}

export interface ExamMonitorRow {
  sessionId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  status: 'in_progress' | 'completed';
  score: number;
  answeredCount: number;
  flaggedCount: number;
  remainingSeconds: number;
  startedAt: string;
  expiresAt: string;
  finishedAt: string | null;
}

export interface ExamMonitoring {
  exam: Exam;
  totalQuestions: number;
  totalPoints: number;
  rows: ExamMonitorRow[];
}

export interface ActiveExamSummary {
  examId: number;
  title: string;
  inProgress: number;
  completed: number;
}

// ===== Sesi Ujian =====
export interface MySession {
  id: number;
  examId: number;
  examTitle: string;
  status: string;
  score: number;
  startedAt: string;
  expiresAt: string;
  finishedAt: string | null;
}

export interface SessionQuestion {
  id: number;
  type: QuestionType;
  questionText: string;
  options: string[];
  points: number;
  answered: boolean;
  answer: string | null;
  correctAnswer?: string;
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface SessionDetail {
  session: {
    id: number;
    examId: number;
    status: 'in_progress' | 'completed';
    startedAt: string;
    expiresAt: string;
    finishedAt: string | null;
    score: number;
    /** Siswa boleh menyelesaikan setelah menit ke-N */
    minSubmitMinutes: number;
    /** Daftar id soal yang ditandai ragu-ragu */
    flaggedQuestions: number[];
    remainingSeconds: number;
  };
  exam: {
    id: number;
    title: string;
    description: string | null;
    durationMinutes: number;
    showScore: boolean;
  };
  progress: {
    answered: number;
    total: number;
  };
  questions: SessionQuestion[];
}

export interface SessionResultAnswer {
  questionId: number;
  questionText: string;
  options: string[];
  points: number;
  answer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface SessionResult {
  sessionId: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  score: number;
  /** false = skor disembunyikan dari siswa oleh pengaturan ujian */
  showScore?: boolean;
  totalPoints: number;
  totalQuestions: number;
  answers: SessionResultAnswer[];
}

export type AnswerStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
