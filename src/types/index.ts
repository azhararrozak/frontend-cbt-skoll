export type UserRole = 'admin' | 'guru' | 'siswa';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface User {
  id: number;
  name: string;
  email: string;
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
  description: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  studentCount?: number;
}

export interface ClassMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

// ===== Ujian =====
export interface Exam {
  id: number;
  title: string;
  description: string | null;
  bankId: number;
  classId: number;
  token: string;
  durationMinutes: number;
  startAt: string | null;
  endAt: string | null;
  isPublished: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamListItem extends Exam {
  bankName: string | null;
  className: string;
  sessionCount: number;
}

export interface ExamDetail extends Exam {
  bankName: string | null;
  className: string;
  totalQuestions: number;
}

export type ExamAvailability = 'open' | 'upcoming' | 'ended';

export interface AvailableExam {
  exam: Exam;
  bankName: string | null;
  className: string;
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
    remainingSeconds: number;
  };
  exam: {
    id: number;
    title: string;
    description: string | null;
    durationMinutes: number;
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
  totalPoints: number;
  totalQuestions: number;
  answers: SessionResultAnswer[];
}

export type AnswerStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
