import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoading,
  Textarea,
} from '../../components/ui';
import { errorMessage, formatDate } from '../../lib/format';
import type { QuestionBank } from '../../types';

interface BankFormState {
  id?: number;
  name: string;
  subject: string;
  description: string;
}

const emptyForm: BankFormState = { name: '', subject: '', description: '' };

export function BanksPage() {
  const [banks, setBanks] = useState<QuestionBank[] | null>(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<BankFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .listBanks({ limit: 100, search: search || undefined })
      .then((res) => {
        if (active) setBanks(res.data ?? []);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [search, reload]);

  const refresh = () => setReload((k) => k + 1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setFormError('');
    try {
      const body = {
        name: form.name.trim(),
        subject: form.subject.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      if (form.id) await api.updateBank(form.id, body);
      else await api.createBank(body);
      setForm(null);
      refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bank: QuestionBank) => {
    if (!confirm(`Hapus bank soal "${bank.name}"? Semua soal di dalamnya ikut terhapus.`)) return;
    try {
      await api.deleteBank(bank.id);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (error && !banks) return <ErrorNote>{error}</ErrorNote>;
  if (!banks) return <PageLoading />;

  return (
    <>
      <PageHeader
        title="Bank Soal"
        subtitle="Kelola kumpulan soal per mata pelajaran"
        actions={
          <Button onClick={() => { setFormError(''); setForm({ ...emptyForm }); }}>
            <Plus className="h-4 w-4" /> Buat Bank Soal
          </Button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari bank soal..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button variant="secondary" type="submit">Cari</Button>
      </form>

      {banks.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title="Belum ada bank soal"
          subtitle="Buat bank soal untuk mulai mengumpulkan soal ujian."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <Card key={bank.id} className="flex flex-col">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to={`/app/bank-soal/${bank.id}`}
                    className="font-semibold text-slate-800 hover:text-indigo-600"
                  >
                    {bank.name}
                  </Link>
                  {bank.subject && (
                    <p className="text-xs font-medium text-indigo-500">{bank.subject}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => { setFormError(''); setForm({ id: bank.id, name: bank.name, subject: bank.subject ?? '', description: bank.description ?? '' }); }}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                    aria-label="Ubah"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bank)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mb-3 line-clamp-2 flex-1 text-sm text-slate-500">
                {bank.description ?? 'Tanpa deskripsi'}
              </p>
              <Link
                to={`/app/bank-soal/${bank.id}`}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Kelola soal →
              </Link>
              <p className="mt-2 text-xs text-slate-400">Dibuat {formatDate(bank.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah Bank Soal' : 'Buat Bank Soal'}
      >
        {form && (
          <div className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>
            <Field label="Nama bank soal">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Bank Soal Matematika"
              />
            </Field>
            <Field label="Mata pelajaran (opsional)">
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="cth: Matematika"
              />
            </Field>
            <Field label="Deskripsi (opsional)">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
              <Button onClick={handleSave} loading={saving} disabled={form.name.trim().length < 2}>
                Simpan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
