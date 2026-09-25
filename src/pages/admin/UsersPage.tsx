import { useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
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
} from '../../components/ui';
import { errorMessage, formatDate } from '../../lib/format';
import type { User, UserRole } from '../../types';

const roleTone: Record<UserRole, 'indigo' | 'blue' | 'green'> = {
  admin: 'indigo',
  guru: 'blue',
  siswa: 'green',
};

export function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [reload, setReload] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'siswa' as UserRole });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .listUsers({
        limit: 100,
        search: search.trim() || undefined,
        role: role || undefined,
      })
      .then((res) => {
        if (active) setUsers(res.data ?? []);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [search, role, reload]);

  const refresh = () => setReload((k) => k + 1);

  const handleCreate = async () => {
    setSaving(true);
    setFormError('');
    try {
      await api.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      setShowCreate(false);
      refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (error && !users) return <ErrorNote>{error}</ErrorNote>;
  if (!users) return <PageLoading />;

  return (
    <>
      <PageHeader
        title="Pengguna"
        subtitle="Kelola akun admin, guru, dan siswa"
        actions={
          <Button onClick={() => { setFormError(''); setForm({ name: '', email: '', password: '', role: 'siswa' }); setShowCreate(true); }}>
            <Plus className="h-4 w-4" /> Buat Akun
          </Button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari nama atau email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-40">
          <option value="">Semua role</option>
          <option value="admin">Admin</option>
          <option value="guru">Guru</option>
          <option value="siswa">Siswa</option>
        </Select>
      </div>

      {users.length === 0 ? (
        <EmptyState title="Tidak ada pengguna" subtitle="Coba ubah kata kunci atau filter role." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase">
                <th className="px-5 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Terdaftar</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={roleTone[u.role]}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {me?.id !== u.id && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Hapus akun "${u.name}"?`)) return;
                          try {
                            await api.deleteUser(u.id);
                            refresh();
                          } catch (err) {
                            setError(errorMessage(err));
                          }
                        }}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Hapus akun"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat Akun">
        <div className="space-y-4">
          <ErrorNote>{formError}</ErrorNote>
          <Field label="Nama">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password" hint="Minimal 8 karakter">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              <option value="siswa">Siswa</option>
              <option value="guru">Guru</option>
              {me?.role === 'admin' && <option value="admin">Admin</option>}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} loading={saving}
              disabled={!form.name.trim() || !form.email.trim() || form.password.length < 8}
            >
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
