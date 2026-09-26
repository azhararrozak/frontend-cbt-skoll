import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, FileText, FileUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  PageLoading,
} from '../../components/ui';
import { ImportExcelModal } from '../../components/ImportExcelModal';
import { MathText } from '../../components/MathText';
import { QuestionFormModal } from '../../components/QuestionFormModal';
import {
  emptyQuestionForm,
  questionToForm,
  TYPE_LABELS,
  type QuestionFormState,
} from '../../components/questionFormState';
import { errorMessage } from '../../lib/format';
import type { Question, QuestionType } from '../../types';

export function BankDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bankId = Number(id);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // form tambah/ubah soal
  const [form, setForm] = useState<QuestionFormState | null>(null);

  // import soal dari Word
  const [showImport, setShowImport] = useState(false);

  const refresh = () => setReload((k) => k + 1);

  useEffect(() => {
    let active = true;
    api
      .listQuestions(bankId)
      .then((res) => {
        if (active) setQuestions(res.data ?? []);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [bankId, reload]);

  const handleDelete = async (q: Question) => {
    if (!confirm('Hapus soal ini?')) return;
    try {
      await api.deleteQuestion(bankId, q.id);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (error && !questions) return <ErrorNote>{error}</ErrorNote>;
  if (!questions) return <PageLoading />;

  return (
    <>
      <Link to="/app/bank-soal" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Bank Soal
      </Link>

      <PageHeader
        title="Kelola Soal"
        subtitle={`${questions.length} soal tersimpan · mendukung rumus matematika via LaTeX`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <FileUp className="h-4 w-4" /> Import Word
            </Button>
            <Button onClick={() => { setForm(emptyQuestionForm()); }}>
              <Plus className="h-4 w-4" /> Tambah Soal
            </Button>
          </>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {questions.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Belum ada soal"
          subtitle="Tambah soal secara manual, atau import banyak soal sekaligus dari dokumen Word (.docx)."
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={q.id} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-500">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone={q.type === 'multiple_choice' ? 'indigo' : q.type === 'true_false' ? 'blue' : 'green'}>
                    {TYPE_LABELS[q.type as QuestionType]}
                  </Badge>
                  <Badge tone="gray">{q.points} poin</Badge>
                </div>
                <p className="font-medium text-slate-700">
                  <MathText text={q.questionText} />
                </p>
                {q.type === 'multiple_choice' && (
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {q.options.map((opt, i) => (
                      <li
                        key={i}
                        className={`rounded-md px-2.5 py-1 text-sm ${
                          String(i) === q.correctAnswer
                            ? 'bg-emerald-50 font-medium text-emerald-700'
                            : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + i)}. <MathText text={opt} />
                      </li>
                    ))}
                  </ul>
                )}
                {q.type === 'true_false' && (
                  <p className="mt-2 text-sm text-emerald-700">
                    Kunci: {q.correctAnswer === '0' ? 'Benar' : 'Salah'}
                  </p>
                )}
                {q.type === 'short_answer' && (
                  <p className="mt-2 text-sm text-emerald-700">
                    Kunci: <MathText text={q.correctAnswer} />
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => setForm(questionToForm(q))}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                  aria-label="Ubah soal"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(q)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Hapus soal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal form soal (dengan toolbar rumus & pratinjau) */}
      <QuestionFormModal
        open={form !== null}
        form={form}
        setForm={setForm}
        bankId={bankId}
        onSaved={refresh}
      />

      {/* Modal import soal dari Word */}
      <ImportExcelModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={refresh}
        title="Import Soal dari Word"
        accept=".docx"
        labelFile="Klik untuk pilih file .docx"
        columnsHint={[
          'Soal dimulai dengan nomor (1. 2. 3.)',
          'Opsi: A. B. C. D. E.',
          'Kunci: JAWABAN: A / BENAR / SALAH',
          'Isian singkat: ISIAN: jawaban',
          'Poin opsional: POIN: 10',
          'Rumus matematika ditulis LaTeX dalam tanda $',
        ]}
        onDownloadTemplate={api.downloadQuestionsTemplate}
        onUpload={(file) => api.importQuestionsDocx(bankId, file)}
      />
    </>
  );
}
