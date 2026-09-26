import type { Question, QuestionType } from '../types';

export type QuestionType_ = QuestionType;

export interface QuestionFormState {
  id?: number;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctIndex: number;
  correctText: string;
  points: number;
}

export const emptyQuestionForm = (): QuestionFormState => ({
  type: 'multiple_choice',
  questionText: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  correctText: '',
  points: 1,
});

export function questionToForm(q: Question): QuestionFormState {
  const isText = q.type === 'short_answer';
  return {
    id: q.id,
    type: q.type,
    questionText: q.questionText,
    options: q.type === 'multiple_choice' ? [...q.options] : ['', '', '', ''],
    correctIndex: isText ? 0 : Number(q.correctAnswer) || 0,
    correctText: isText ? q.correctAnswer : '',
    points: q.points,
  };
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Pilihan Ganda',
  true_false: 'Benar / Salah',
  short_answer: 'Isian Singkat',
};
