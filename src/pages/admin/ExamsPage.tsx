import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  BarChart3,
  ClipboardList,
  Copy,
  KeyRound,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/useAuth';
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
import { errorMessage, formatDateTime, toDatetimeLocal } from '../../lib/format';
import type { ClassRoom, ExamDetail, ExamListItem, QuestionBank } from '../../types';

interface ExamFormState {
  id?: number;
  title: string;
  description: string;
  bankId: string;
  classIds: number[];
  durationMinutes: number;
  minSubmitMinutes: number;
  showScore: boolean;
  shuffleQuestions: boolean;
  token: string;
  startAt: string; // datetime-local
  endAt: string;
  isPublished: boolean;
}

const emptyForm = (): ExamFormState => ({
  title: '',
  description: '',
  bankId: '',
  classIds: [],
  durationMinutes: 60,
  minSubmitMinutes: 0,
  showScore: true,
  shuffleQuestions: false,
  token: '',
  startAt: '',
  endAt: '',
  isPublished: false,
});

export function ExamsPage() {
  const { user: me } = useAuth();
  const [exams, setExams] = useState<ExamListItem[] | null>(null);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);

  const [form, setForm] = useState<ExamFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listExams({ limit: 100, search: search || undefined })
      .then((res) => {
        if (active) setExams(res.data ?? []);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [search, reload]);

  useEffect(() => {
    let active = true;
    Promise.all([api.listBanks({ limit: 100 }), api.listClasses({ limit: 100 })])
      .then(([b, c]) => {
        if (!active) return;
        setBanks(b.data ?? []);
        setClasses(c.data ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const refresh = () => setReload((k) => k + 1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const openEdit = async (exam: ExamListItem) => {
    setFormError('');
    try {
      const res = await api.getExam(exam.id);
      const d = res.data as ExamDetail;
      setForm({
        id: d.id,
        title: d.title,
        description: d.description ?? '',
        bankId: String(d.bankId),
        classIds: d.classIds,
        durationMinutes: d.durationMinutes,
        minSubmitMinutes: d.minSubmitMinutes,
        showScore: d.showScore,
        shuffleQuestions: d.shuffleQuestions,
        token: d.token,
        startAt: toDatetimeLocal(d.startAt),
        endAt: toDatetimeLocal(d.endAt),
        isPublished: d.isPublished,
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (banks.length === 0) {
      setFormError('Buat bank soal terlebih dahulu di menu Bank Soal.');
      return;
    }
    if (classes.length === 0) {
      setFormError('Buat kelas terlebih dahulu di menu Kelas.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        bankId: Number(form.bankId),
        classIds: form.classIds,
        durationMinutes: form.durationMinutes,
        minSubmitMinutes: form.minSubmitMinutes,
        showScore: form.showScore,
        shuffleQuestions: form.shuffleQuestions,
        isPublished: form.isPublished,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.token.trim()) body.token = form.token.trim().toUpperCase();
      if (form.startAt) body.startAt = new Date(form.startAt).toISOString();
      if (form.endAt) body.endAt = new Date(form.endAt).toISOString();

      if (form.id) await api.updateExam(form.id, body);
      else await api.createExam(body);
      setForm(null);
      refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam: ExamListItem) => {
    // Ujian yang sudah dikerjakan menyimpan nilai siswa — perlindungan data
    if (exam.sessionCount > 0) {
      if (me?.role === 'admin') {
        const ok = confirm(
          `Ujian "${exam.title}" sudah dikerjakan oleh ${exam.sessionCount} siswa.\n\n` +
            'Hapus PERMANEN beserta seluruh jawaban dan nilai siswa?\nTindakan ini tidak bisa dibatalkan!',
        );
        if (!ok) return;
        try {
          await api.deleteExam(exam.id, true);
          refresh();
        } catch (err) {
          setError(errorMessage(err));
        }
        return;
      }
      setError(
        `Ujian "${exam.title}" sudah dikerjakan oleh ${exam.sessionCount} siswa sehingga tidak bisa dihapus ` +
          'karena menyimpan data nilai. Sebagai alternatif, nonaktifkan publikasinya (klik badge status). ' +
          'Hapus permanen hanya bisa dilakukan admin.',
      );
      return;
    }
    if (!confirm(`Hapus ujian "${exam.title}"?`)) return;
    try {
      await api.deleteExam(exam.id);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleRegenerate = async (exam: ExamListItem) => {
    if (!confirm(`Ganti token ujian "${exam.title}"? Token lama tidak bisa dipakai lagi.`)) return;
    try {
      await api.regenerateToken(exam.id);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const copyToken = async (exam: ExamListItem) => {
    try {
      await navigator.clipboard.writeText(exam.token);
      setCopiedId(exam.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const togglePublish = async (exam: ExamListItem) => {
    try {
      await api.updateExam(exam.id, { isPublished: !exam.isPublished });
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (error && !exams) return <ErrorNote>{error}</ErrorNote>;
  if (!exams) return <PageLoading />;

  return (
    <>
      <PageHeader
        title="Ujian"
        subtitle="Buat ujian, atur token, dan pantau status"
        actions={
          <Button
            onClick={() => { setFormError(''); setForm(emptyForm()); }}
            disabled={banks.length === 0 || classes.length === 0}
          >
            <Plus className="h-4 w-4" /> Buat Ujian
          </Button>
        }
      />

      {(banks.length === 0 || classes.length === 0) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Untuk membuat ujian, siapkan dulu{' '}
          <Link to="/app/bank-soal" className="font-semibold underline">bank soal</Link> dan{' '}
          <Link to="/app/kelas" className="font-semibold underline">kelas</Link>.
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari ujian..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button variant="secondary" type="submit">Cari</Button>
      </form>

      {exams.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title="Belum ada ujian"
          subtitle="Buat ujian dari bank soal yang sudah tersedia, lalu bagikan token ke siswa."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase">
                <th className="px-5 py-3 font-medium">Ujian</th>
                <th className="px-4 py-3 font-medium">Jadwal</th>
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-700">{exam.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {exam.classNames} · {exam.bankName ?? 'bank dihapus'} ·{' '}
                      {exam.durationMinutes} menit · {exam.sessionCount} sesi
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {exam.startAt ? formatDateTime(exam.startAt) : 'Tanpa jadwal'}
                    <br />
                    s/d {exam.endAt ? formatDateTime(exam.endAt) : '-'}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-bold tracking-widest text-slate-700">
                        {exam.token}
                      </code>
                      <button
                        onClick={() => copyToken(exam)}
                        className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                        aria-label="Salin token"
                        title="Salin token"
                      >
                        <Copy className={`h-3.5 w-3.5 ${copiedId === exam.id ? 'text-emerald-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleRegenerate(exam)}
                        className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600"
                        aria-label="Regenerate token"
                        title="Buat token baru"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => togglePublish(exam)} className="cursor-pointer" title="Klik untuk ubah status">
                      <Badge tone={exam.isPublished ? 'green' : 'yellow'}>
                        {exam.isPublished ? 'Terpublikasi' : 'Draf'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/app/ujian/${exam.id}/hasil`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                        title="Lihat hasil"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(exam)}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                        title="Ubah ujian"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(exam)}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus ujian"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Modal form ujian */}
      <Modal open={form !== null} onClose={() => setForm(null)} title={form?.id ? 'Ubah Ujian' : 'Buat Ujian'} wide>
        {form && (
          <div className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>
            <Field label="Judul ujian">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="cth: Ujian Tengah Semester Matematika"
              />
            </Field>
            <Field label="Deskripsi (opsional)">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bank soal">
                <Select value={form.bankId} onChange={(e) => setForm({ ...form, bankId: e.target.value })}>
                  <option value="">— pilih bank soal —</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Durasi (menit)">
                <Input
                  type="number"
                  min={1}
                  max={600}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                />
              </Field>
            </div>

            {/* Kelas peserta: multi-pilih */}
            <Field
              label={`Kelas peserta (${form.classIds.length} dipilih)`}
              hint="Siswa dari semua kelas terpilih bisa mengikuti ujian ini"
            >
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-slate-300 p-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, classIds: form.classIds.length === classes.length ? [] : classes.map((c) => c.id) })
                  }
                  className="cursor-pointer text-xs font-medium text-indigo-600 hover:underline"
                >
                  {form.classIds.length === classes.length ? 'Hapus semua' : 'Pilih semua'}
                </button>
                {[...new Set(classes.map((c) => c.grade))].map((grade) => (
                  <div key={grade}>
                    <p className="mb-1 text-xs font-semibold text-slate-400 uppercase">Kelas {grade}</p>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {classes
                        .filter((c) => c.grade === grade)
                        .map((c) => (
                          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={form.classIds.includes(c.id)}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  classIds: e.target.checked
                                    ? [...form.classIds, c.id]
                                    : form.classIds.filter((v) => v !== c.id),
                                })
                              }
                              className="h-4 w-4 accent-indigo-600"
                            />
                            <span className="text-sm text-slate-600">{c.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Boleh dikumpulkan mulai menit ke-"
                hint="0 = kapan saja. Contoh: 40 → untuk durasi 60 menit, siswa bisa submit setelah 40 menit"
              >
                <Input
                  type="number"
                  min={0}
                  max={form.durationMinutes - 1}
                  value={form.minSubmitMinutes}
                  onChange={(e) => setForm({ ...form, minSubmitMinutes: Number(e.target.value) })}
                />
              </Field>
              <Field label="Token" hint="Kosongkan untuk dibuat otomatis">
                <Input
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value.toUpperCase() })}
                  placeholder="cth: UJIAN1"
                  maxLength={10}
                  className="font-mono tracking-widest"
                />
              </Field>
              <Field label="Mulai (opsional)">
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                />
              </Field>
              <Field label="Selesai (opsional)">
                <Input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                />
              </Field>
            </div>

            <div className="space-y-2 rounded-lg bg-slate-50 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                Publikasikan (siswa bisa melihat &amp; memulai ujian ini)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.showScore}
                  onChange={(e) => setForm({ ...form, showScore: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                Tampilkan skor ke siswa setelah selesai
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.shuffleQuestions}
                  onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                  className="h-4 w-4 accent-indigo-600"
                />
                Acak urutan soal (berbeda untuk tiap siswa)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!form.title.trim() || !form.bankId || form.classIds.length === 0}
              >
                <KeyRound className="h-4 w-4" /> Simpan Ujian
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
