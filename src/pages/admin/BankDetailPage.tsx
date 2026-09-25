import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoading,
  Select,
  Textarea,
} from '../../components/ui';
import { errorMessage } from '../../lib/format';
import type { Question, QuestionType } from '../../types';

const typeLabels: Record<QuestionType, string> = {
  multiple_choice: 'Pilihan Ganda',
  true_false: 'Benar / Salah',
  short_answer: 'Isian Singkat',
};

interface QuestionFormState {
  id?: number;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctIndex: number;
  correctText: string;
  points: number;
}

const emptyForm: QuestionFormState = {
  type: 'multiple_choice',
  questionText: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  correctText: '',
  points: 1,
};

function questionToForm(q: Question): QuestionFormState {
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

export function BankDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bankId = Number(id);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<QuestionFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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

  const refresh = () => setReload((k) => k + 1);

  const setFormPartial = (patch: Partial<QuestionFormState>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));

  const handleTypeChange = (type: QuestionType) => {
    setFormPartial({
      type,
      correctIndex: 0,
      correctText: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : [''],
    });
  };

  const setOption = (idx: number, value: string) =>
    setForm((f) => {
      if (!f) return f;
      const options = [...f.options];
      options[idx] = value;
      return { ...f, options };
    });

  const addOption = () =>
    setForm((f) => (f && f.options.length < 5 ? { ...f, options: [...f.options, ''] } : f));

  const removeOption = (idx: number) =>
    setForm((f) => {
      if (!f || f.options.length <= 2) return f;
      const options = f.options.filter((_, i) => i !== idx);
      return { ...f, options, correctIndex: Math.min(f.correctIndex, options.length - 1) };
    });

  const validate = (f: QuestionFormState): string => {
    if (!f.questionText.trim()) return 'Teks soal wajib diisi';
    if (f.type === 'multiple_choice') {
      const filled = f.options.filter((o) => o.trim());
      if (filled.length < 2) return 'Minimal 2 opsi jawaban terisi';
      if (!f.options[f.correctIndex]?.trim()) return 'Kunci jawaban harus salah satu opsi terisi';
    }
    if (f.type === 'short_answer' && !f.correctText.trim()) return 'Kunci jawaban wajib diisi';
    if (f.points < 1 || f.points > 100) return 'Poin harus antara 1-100';
    return '';
  };

  const handleSave = async () => {
    if (!form) return;
    const v = validate(form);
    if (v) {
      setFormError(v);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body =
        form.type === 'multiple_choice'
          ? {
              type: form.type,
              questionText: form.questionText.trim(),
              points: form.points,
              options: form.options.map((o) => o.trim()),
              correctAnswer: form.correctIndex,
            }
          : form.type === 'true_false'
            ? {
                type: form.type,
                questionText: form.questionText.trim(),
                points: form.points,
                correctAnswer: form.correctIndex,
              }
            : {
                type: form.type,
                questionText: form.questionText.trim(),
                points: form.points,
                correctAnswer: form.correctText.trim(),
              };

      if (form.id) await api.updateQuestion(bankId, form.id, body);
      else await api.createQuestion(bankId, body);
      setForm(null);
      refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

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
        subtitle={`${questions.length} soal tersimpan`}
        actions={
          <Button onClick={() => { setFormError(''); setForm({ ...emptyForm }); }}>
            <Plus className="h-4 w-4" /> Tambah Soal
          </Button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {questions.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Belum ada soal"
          subtitle="Tambahkan soal pilihan ganda, benar/salah, atau isian singkat."
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
                    {typeLabels[q.type]}
                  </Badge>
                  <Badge tone="gray">{q.points} poin</Badge>
                </div>
                <p className="font-medium text-slate-700">{q.questionText}</p>
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
                        {String.fromCharCode(65 + i)}. {opt}
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
                  <p className="mt-2 text-sm text-emerald-700">Kunci: {q.correctAnswer}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => { setFormError(''); setForm(questionToForm(q)); }}
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

      {/* Modal form soal */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah Soal' : 'Tambah Soal'}
        wide
      >
        {form && (
          <div className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipe soal">
                <Select value={form.type} onChange={(e) => handleTypeChange(e.target.value as QuestionType)}>
                  <option value="multiple_choice">Pilihan Ganda</option>
                  <option value="true_false">Benar / Salah</option>
                  <option value="short_answer">Isian Singkat</option>
                </Select>
              </Field>
              <Field label="Poin">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.points}
                  onChange={(e) => setFormPartial({ points: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Teks soal">
              <Textarea
                value={form.questionText}
                onChange={(e) => setFormPartial({ questionText: e.target.value })}
                placeholder="Tulis pertanyaan di sini..."
              />
            </Field>

            {form.type === 'multiple_choice' && (
              <div>
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Opsi jawaban (2-5) — centang kunci jawaban
                </span>
                <div className="space-y-2">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct"
                        checked={form.correctIndex === i}
                        onChange={() => setFormPartial({ correctIndex: i })}
                        className="h-4 w-4 shrink-0 accent-emerald-600"
                        aria-label={`Jadikan opsi ${String.fromCharCode(65 + i)} sebagai kunci`}
                      />
                      <Input
                        value={opt}
                        onChange={(e) => setOption(i, e.target.value)}
                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                      />
                      {form.options.length > 2 && (
                        <button
                          onClick={() => removeOption(i)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Hapus opsi"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.options.length < 5 && (
                  <Button variant="ghost" onClick={addOption} className="mt-2 px-2 py-1 text-xs">
                    + Tambah opsi
                  </Button>
                )}
              </div>
            )}

            {form.type === 'true_false' && (
              <Field label="Kunci jawaban">
                <Select
                  value={form.correctIndex}
                  onChange={(e) => setFormPartial({ correctIndex: Number(e.target.value) })}
                >
                  <option value={0}>Benar</option>
                  <option value={1}>Salah</option>
                </Select>
              </Field>
            )}

            {form.type === 'short_answer' && (
              <Field label="Kunci jawaban" hint="Jawaban siswa dicocokkan tanpa membedakan huruf besar/kecil">
                <Input
                  value={form.correctText}
                  onChange={(e) => setFormPartial({ correctText: e.target.value })}
                  placeholder="cth: hasil bagi"
                />
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
              <Button onClick={handleSave} loading={saving}>Simpan Soal</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
