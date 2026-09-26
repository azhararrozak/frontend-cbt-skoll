import { useRef, useState } from 'react';
import { api } from '../lib/api';
import { MathToolbar } from './MathToolbar';
import { MathText } from './MathText';
import {
  Badge,
  Button,
  ErrorNote,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from './ui';
import { errorMessage } from '../lib/format';
import type { QuestionFormState } from './questionFormState';
import type { QuestionType } from '../types';

interface QuestionFormModalProps {
  open: boolean;
  form: QuestionFormState | null;
  setForm: (form: QuestionFormState | null) => void;
  bankId: number;
  onSaved: () => void;
}

export function QuestionFormModal({ open, form, setForm, bankId, onSaved }: QuestionFormModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  if (!form) return null;

  const setFormPartial = (patch: Partial<QuestionFormState>) =>
    setForm({ ...form, ...patch });

  /** Sisipkan snippet posisi kursor textarea (dipakai toolbar rumus) */
  const insertSnippet = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? start;
    const next = ta.value.slice(0, start) + snippet + ta.value.slice(end);
    setFormPartial({ questionText: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + snippet.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const setOption = (idx: number, value: string) => {
    const options = [...form.options];
    options[idx] = value;
    setFormPartial({ options });
  };

  const addOption = () => {
    if (form.options.length < 5) setFormPartial({ options: [...form.options, ''] });
  };

  const removeOption = (idx: number) => {
    if (form.options.length <= 2) return;
    const options = form.options.filter((_, i) => i !== idx);
    setFormPartial({ options, correctIndex: Math.min(form.correctIndex, options.length - 1) });
  };

  const handleTypeChange = (type: QuestionType) => {
    setFormPartial({
      type,
      correctIndex: 0,
      correctText: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : [''],
    });
  };

  const validate = (): string => {
    if (!form.questionText.trim()) return 'Teks soal wajib diisi';
    if (form.type === 'multiple_choice') {
      const filled = form.options.filter((o) => o.trim());
      if (filled.length < 2) return 'Minimal 2 opsi jawaban terisi';
      if (!form.options[form.correctIndex]?.trim()) return 'Kunci jawaban harus salah satu opsi terisi';
    }
    if (form.type === 'short_answer' && !form.correctText.trim()) return 'Kunci jawaban wajib diisi';
    if (form.points < 1 || form.points > 100) return 'Poin harus antara 1-100';
    return '';
  };

  const handleSave = async () => {
    const v = validate();
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
      onSaved();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={() => setForm(null)} title={form.id ? 'Ubah Soal' : 'Tambah Soal'} wide>
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
          <MathToolbar onInsert={insertSnippet} />
          <Textarea
            ref={textareaRef}
            value={form.questionText}
            onChange={(e) => setFormPartial({ questionText: e.target.value })}
            placeholder={'Tulis pertanyaan. Rumus dibungkus tanda $, cth: $\\frac{1}{2}$ atau $x^{2}$'}
          />
        </Field>

        {form.type === 'multiple_choice' && (
          <div>
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Opsi jawaban (2-5) — pilih radio sebagai kunci
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
                      ✕
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

        {/* Pratinjau tampilan siswa */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="indigo">Pratinjau</Badge>
            <span className="text-xs text-slate-400">Seperti yang dilihat siswa</span>
          </div>
          <p className="font-medium text-slate-800">
            <MathText text={form.questionText || 'Teks soal akan tampil di sini...'} />
          </p>
          {form.type === 'multiple_choice' && (
            <ul className="mt-2 space-y-1">
              {form.options.map((opt, i) =>
                opt.trim() ? (
                  <li
                    key={i}
                    className={`rounded-md px-2.5 py-1 text-sm ${
                      form.correctIndex === i
                        ? 'bg-emerald-100 font-medium text-emerald-700'
                        : 'bg-white text-slate-600'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. <MathText text={opt} />
                  </li>
                ) : null,
              )}
            </ul>
          )}
          {form.type === 'true_false' && (
            <p className="mt-2 text-sm text-emerald-700">
              Kunci: {form.correctIndex === 0 ? 'Benar' : 'Salah'}
            </p>
          )}
          {form.type === 'short_answer' && form.correctText.trim() && (
            <p className="mt-2 text-sm text-emerald-700">Kunci: {form.correctText}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
          <Button onClick={handleSave} loading={saving}>Simpan Soal</Button>
        </div>
      </div>
    </Modal>
  );
}
