import { useEffect, useState } from 'react';
import { Plus, School, Trash2, UserPlus, X } from 'lucide-react';
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
} from '../../components/ui';
import { errorMessage } from '../../lib/format';
import type { ClassMember, ClassRoom, User } from '../../types';

export function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // form buat kelas
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // kelola anggota
  const [membersOf, setMembersOf] = useState<ClassRoom | null>(null);
  const [members, setMembers] = useState<ClassMember[] | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    let active = true;
    api
      .listClasses({ limit: 100 })
      .then((res) => {
        if (active) setClasses(res.data ?? []);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const refresh = () => setReload((k) => k + 1);

  const handleCreate = async () => {
    setSaving(true);
    setFormError('');
    try {
      await api.createClass({ name: name.trim() });
      setName('');
      setShowCreate(false);
      refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kelas: ClassRoom) => {
    if (!confirm(`Hapus kelas "${kelas.name}"?`)) return;
    try {
      await api.deleteClass(kelas.id);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const openMembers = async (kelas: ClassRoom) => {
    setMembersOf(kelas);
    setMembers(null);
    setSelected([]);
    try {
      const [memberRes, studentRes] = await Promise.all([
        api.listClassMembers(kelas.id),
        api.listUsers({ limit: 100, role: 'siswa' }),
      ]);
      setMembers(memberRes.data ?? []);
      setStudents(studentRes.data ?? []);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleAddMembers = async () => {
    if (!membersOf || selected.length === 0) return;
    try {
      await api.addClassMembers(membersOf.id, selected);
      await openMembers(membersOf);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleRemoveMember = async (studentId: number) => {
    if (!membersOf) return;
    try {
      await api.removeClassMember(membersOf.id, studentId);
      await openMembers(membersOf);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (error && !classes) return <ErrorNote>{error}</ErrorNote>;
  if (!classes) return <PageLoading />;

  const memberIds = new Set((members ?? []).map((m) => m.id));
  const addable = students.filter((s) => !memberIds.has(s.id));

  return (
    <>
      <PageHeader
        title="Kelas"
        subtitle="Kelola kelas dan daftar siswa"
        actions={
          <Button onClick={() => { setFormError(''); setShowCreate(true); }}>
            <Plus className="h-4 w-4" /> Buat Kelas
          </Button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {classes.length === 0 ? (
        <EmptyState
          icon={<School className="h-10 w-10" />}
          title="Belum ada kelas"
          subtitle="Buat kelas untuk mengelompokkan siswa dan menugaskan ujian."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((kelas) => (
            <Card key={kelas.id} className="flex flex-col">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{kelas.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                    {kelas.description ?? 'Tanpa deskripsi'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(kelas)}
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Hapus kelas"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Button variant="secondary" onClick={() => openMembers(kelas)} className="mt-auto w-full">
                <UserPlus className="h-4 w-4" /> Kelola Siswa
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Modal buat kelas */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Buat Kelas">
        <div className="space-y-4">
          <ErrorNote>{formError}</ErrorNote>
          <Field label="Nama kelas">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth: XI IPA 1" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button onClick={handleCreate} loading={saving} disabled={name.trim().length < 2}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal kelola anggota */}
      <Modal
        open={membersOf !== null}
        onClose={() => setMembersOf(null)}
        title={membersOf ? `Siswa — ${membersOf.name}` : ''}
        wide
      >
        {members === null ? (
          <p className="py-4 text-center text-sm text-slate-400">Memuat...</p>
        ) : (
          <div className="space-y-4">
            {members.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada siswa di kelas ini.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Keluarkan dari kelas"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Tambah siswa</p>
              {addable.length === 0 ? (
                <p className="text-sm text-slate-400">Semua siswa sudah tergabung.</p>
              ) : (
                <>
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {addable.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selected.includes(s.id)}
                          onChange={(e) =>
                            setSelected((prev) =>
                              e.target.checked ? [...prev, s.id] : prev.filter((v) => v !== s.id),
                            )
                          }
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="text-sm text-slate-600">
                          {s.name} <span className="text-slate-400">({s.email})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleAddMembers}
                    disabled={selected.length === 0}
                    className="mt-3 w-full"
                  >
                    Tambah {selected.length > 0 ? `(${selected.length})` : ''} ke Kelas
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
