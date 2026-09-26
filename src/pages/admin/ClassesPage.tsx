import { useEffect, useMemo, useState } from 'react';
import { Plus, School, Trash2, UserPlus, Upload } from 'lucide-react';
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
  Select,
  Textarea,
} from '../../components/ui';
import { ImportExcelModal } from '../../components/ImportExcelModal';
import { errorMessage } from '../../lib/format';
import type { ClassMember, ClassRoom, User } from '../../types';

/** Urutkan jenjang secara alami: angka dulu (1-6), lalu romawi (VII-VIII-IX), lalu alfabet */
function sortGrades(grades: string[]): string[] {
  const romanOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return [...grades].sort((a, b) => {
    const ia = parseInt(a, 10);
    const ib = parseInt(b, 10);
    if (!Number.isNaN(ia) && !Number.isNaN(ib)) return ia - ib;
    if (!Number.isNaN(ia)) return -1;
    if (!Number.isNaN(ib)) return 1;
    const ra = romanOrder.indexOf(a.toUpperCase());
    const rb = romanOrder.indexOf(b.toUpperCase());
    if (ra !== -1 && rb !== -1) return ra - rb;
    return a.localeCompare(b, 'id');
  });
}

interface ClassFormState {
  id?: number;
  name: string;
  grade: string;
  jurusan: string;
  description: string;
}

const emptyForm = (): ClassFormState => ({ name: '', grade: 'VII', jurusan: 'Umum', description: '' });

export function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // filter jenjang
  const [gradeFilter, setGradeFilter] = useState('all');

  // form buat/ubah kelas
  const [form, setForm] = useState<ClassFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // import excel
  const [showImport, setShowImport] = useState(false);
  const [importMembersFor, setImportMembersFor] = useState<ClassRoom | null>(null);

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

  const allGrades = useMemo(
    () => sortGrades([...new Set((classes ?? []).map((c) => c.grade))]),
    [classes],
  );

  const grouped = useMemo(() => {
    const filtered =
      gradeFilter === 'all' ? (classes ?? []) : (classes ?? []).filter((c) => c.grade === gradeFilter);
    const map = new Map<string, ClassRoom[]>();
    for (const kelas of filtered) {
      const list = map.get(kelas.grade) ?? [];
      list.push(kelas);
      map.set(kelas.grade, list);
    }
    return sortGrades([...map.keys()]).map((grade) => ({
      grade,
      items: map.get(grade)!,
    }));
  }, [classes, gradeFilter]);

  const handleCreate = async () => {
    if (!form) return;
    setSaving(true);
    setFormError('');
    try {
      const body = {
        name: form.name.trim(),
        grade: form.grade.trim() || 'Umum',
        jurusan: form.jurusan.trim() || 'Umum',
        description: form.description.trim() || undefined,
      };
      if (form.id) await api.updateClass(form.id, body);
      else await api.createClass(body);
      setForm(null);
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
        subtitle="Dikelompokkan per jenjang — VII, VIII, IX, atau jenjang lain sesuai sekolah"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" /> Import Excel
            </Button>
            <Button onClick={() => { setFormError(''); setForm(emptyForm()); }}>
              <Plus className="h-4 w-4" /> Buat Kelas
            </Button>
          </>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {/* Filter jenjang */}
      {allGrades.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            onClick={() => setGradeFilter('all')}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              gradeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({classes.length})
          </button>
          {allGrades.map((grade) => (
            <button
              key={grade}
              onClick={() => setGradeFilter(grade)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                gradeFilter === grade ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              Kelas {grade} ({classes.filter((c) => c.grade === grade).length})
            </button>
          ))}
        </div>
      )}

      {classes.length === 0 ? (
        <EmptyState
          icon={<School className="h-10 w-10" />}
          title="Belum ada kelas"
          subtitle="Buat kelas manual atau import banyak kelas sekaligus dari file Excel."
        />
      ) : (
        grouped.map(({ grade, items }) => (
          <section key={grade} className="mb-7">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="font-bold text-slate-700">Kelas {grade}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                {items.length} kelas · {items.reduce((s, c) => s + (c.studentCount ?? 0), 0)} siswa
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((kelas) => (
                <Card key={kelas.id} className="flex flex-col">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{kelas.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {kelas.jurusan !== 'Umum' ? `Jurusan ${kelas.jurusan}` : 'Umum'}
                        {kelas.description ? ` · ${kelas.description}` : ''}
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
          </section>
        ))
      )}

      {/* Modal buat/ubah kelas */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah Kelas' : 'Buat Kelas'}
      >
        {form && (
          <div className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>
            <Field label="Nama kelas">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: VII A"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jenjang" hint="Sesuaikan dengan jenjang sekolah">
                <Select
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                >
                  <optgroup label="Umum">
                    <option value="Umum">Umum / Tanpa jenjang</option>
                  </optgroup>
                  <optgroup label="SD (Kelas 1-6)">
                    {['1', '2', '3', '4', '5', '6'].map((g) => (
                      <option key={g} value={g}>{`Kelas ${g}`}</option>
                    ))}
                  </optgroup>
                  <optgroup label="SMP (Kelas VII-IX)">
                    {['VII', 'VIII', 'IX'].map((g) => (
                      <option key={g} value={g}>{`Kelas ${g}`}</option>
                    ))}
                  </optgroup>
                  <optgroup label="SMA/SMK (Kelas X-XII)">
                    {['X', 'XI', 'XII'].map((g) => (
                      <option key={g} value={g}>{`Kelas ${g}`}</option>
                    ))}
                  </optgroup>
                </Select>
              </Field>
              <Field label="Jurusan" hint="Isikan Umum bila tidak ada jurusan">
                <Input
                  value={form.jurusan}
                  onChange={(e) => setForm({ ...form, jurusan: e.target.value })}
                  placeholder="cth: Umum / IPA / IPS"
                />
              </Field>
            </div>
            <Field label="Deskripsi (opsional)">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
              <Button onClick={handleCreate} loading={saving} disabled={form.name.trim().length < 2}>
                Simpan
              </Button>
            </div>
          </div>
        )}
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
                      <p className="text-xs text-slate-400">
                        {m.nisn || m.nis ? (
                          <span className="font-mono">
                            {m.nisn ? `NISN ${m.nisn}` : ''}{m.nisn && m.nis ? ' · ' : ''}{m.nis ? `NIS ${m.nis}` : ''}
                          </span>
                        ) : (
                          m.email
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Keluarkan dari kelas"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Tambah siswa</p>
                <Button variant="secondary" onClick={() => setImportMembersFor(membersOf)} className="px-3 py-1.5 text-xs">
                  <Upload className="h-3.5 w-3.5" /> Import Excel
                </Button>
              </div>
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

      {/* Modal import Excel: daftar kelas */}
      <ImportExcelModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={refresh}
        title="Import Kelas dari Excel"
        columnsHint={[
          'nama (wajib)',
          'jenjang (cth: VII)',
          'jurusan (default Umum)',
          'deskripsi (opsional)',
        ]}
        onDownloadTemplate={api.downloadClassesTemplate}
        onUpload={api.importClasses}
      />

      {/* Modal import Excel: siswa ke kelas tertentu */}
      <ImportExcelModal
        open={importMembersFor !== null}
        onClose={() => setImportMembersFor(null)}
        onSuccess={() => importMembersFor && openMembers(importMembersFor)}
        title={`Import Siswa ke ${importMembersFor?.name ?? 'Kelas'}`}
        columnsHint={[
          'nama (wajib)',
          'nis (opsional)',
          'nisn (isi NISN atau NIS)',
          'password (opsional, default password123)',
          'Siswa sudah terdaftar otomatis digabungkan; belum terdaftar akan dibuatkan akunnya.',
        ]}
        onDownloadTemplate={api.downloadClassStudentsTemplate}
        onUpload={(file) => api.importClassStudents(importMembersFor!.id, file)}
      />
    </>
  );
}
