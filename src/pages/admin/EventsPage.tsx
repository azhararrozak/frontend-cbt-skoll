import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react';
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
import type { EventItem } from '../../types';

interface EventFormState {
  id?: number;
  title: string;
  schoolName: string;
  schoolAddress: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  description: string;
  signerName: string;
  signerTitle: string;
  signerNip: string;
  examIds: number[];
}

const emptyForm = (): EventFormState => ({
  title: '',
  schoolName: '',
  schoolAddress: '',
  academicYear: '',
  startDate: '',
  endDate: '',
  description: '',
  signerName: '',
  signerTitle: '',
  signerNip: '',
  examIds: [],
});

export function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [exams, setExams] = useState<{ id: number; title: string }[]>([]);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const [form, setForm] = useState<EventFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const refresh = () => setReload((k) => k + 1);

  useEffect(() => {
    let active = true;
    Promise.all([api.listEvents(), api.listExams({ limit: 100 })])
      .then(([eventRes, examRes]) => {
        if (!active) return;
        setEvents(eventRes.data ?? []);
        setExams((examRes.data ?? []).map((e) => ({ id: e.id, title: e.title })));
      })
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [reload]);

  const openEdit = useCallback(async (event: EventItem) => {
    setFormError('');
    try {
      const res = await api.getEvent(event.id);
      const d = res.data!;
      setForm({
        id: d.id,
        title: d.title,
        schoolName: d.schoolName,
        schoolAddress: d.schoolAddress ?? '',
        academicYear: d.academicYear ?? '',
        startDate: (d.startDate ?? '').slice(0, 10),
        endDate: (d.endDate ?? '').slice(0, 10),
        description: d.description ?? '',
        signerName: d.signerName ?? '',
        signerTitle: d.signerTitle ?? '',
        signerNip: d.signerNip ?? '',
        examIds: d.exams.map((e) => e.id),
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setFormError('');
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        schoolName: form.schoolName.trim(),
        schoolAddress: form.schoolAddress.trim() || undefined,
        academicYear: form.academicYear.trim() || undefined,
        signerName: form.signerName.trim() || undefined,
        signerTitle: form.signerTitle.trim() || undefined,
        signerNip: form.signerNip.trim() || undefined,
        examIds: form.examIds,
      };
      if (form.startDate) body.startDate = new Date(form.startDate).toISOString();
      if (form.endDate) body.endDate = new Date(form.endDate).toISOString();
      if (form.description.trim()) body.description = form.description.trim();

      if (form.id) await api.updateEvent(form.id, body);
      else await api.createEvent(body);
      setForm(null);
      refresh();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: EventItem) => {
    if (!confirm(`Hapus event "${event.title}"? Ujian di dalamnya tidak ikut terhapus.`)) return;
    try {
      await api.deleteEvent(event.id);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (error && !events) return <ErrorNote>{error}</ErrorNote>;
  if (!events) return <PageLoading />;

  return (
    <>
      <PageHeader
        title="Event Ujian"
        subtitle="Kelola kegiatan ujian (cth: UTS/PAS) beserta dokumen pesertanya"
        actions={
          <Button onClick={() => { setFormError(''); setForm(emptyForm()); }}>
            <Plus className="h-4 w-4" /> Buat Event
          </Button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarRange className="h-10 w-10" />}
          title="Belum ada event"
          subtitle="Buat event untuk mengelompokkan ujian dan mencetak kartu peserta, daftar hadir, serta nomor meja."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/app/event/${event.id}`} className="font-semibold text-slate-800 hover:text-indigo-600">
                    {event.title}
                  </Link>
                  <p className="text-xs text-indigo-500">{event.schoolName}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(event)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                    aria-label="Ubah event"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(event)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Hapus event"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                {event.examCount} ujian{event.academicYear ? ` · TP ${event.academicYear}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {event.startDate ? `${formatDate(event.startDate)} — ${formatDate(event.endDate)}` : 'Tanpa periode'}
              </p>
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => navigate(`/app/event/${event.id}`)}
              >
                Kelola &amp; Cetak Dokumen
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Modal buat/ubah event */}
      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah Event' : 'Buat Event'}
        wide
      >
        {form && (
          <div className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>
            <Field label="Nama event" hint="cth: Ujian Tengah Semester Ganjil">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama sekolah (untuk kop)">
                <Input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
              </Field>
              <Field label="Tahun pelajaran">
                <Input
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  placeholder="cth: 2026/2027"
                />
              </Field>
            </div>
            <Field label="Alamat sekolah (untuk kop)">
              <Textarea
                value={form.schoolAddress}
                onChange={(e) => setForm({ ...form, schoolAddress: e.target.value })}
                className="min-h-[60px]"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mulai (opsional)">
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Field>
              <Field label="Selesai (opsional)">
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Field>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-700">Penandatangan Dokumen (opsional)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Nama Pejabat">
                  <Input
                    value={form.signerName}
                    onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                    placeholder="cth: Drs. H. Ahmad"
                  />
                </Field>
                <Field label="Jabatan">
                  <Input
                    value={form.signerTitle}
                    onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
                    placeholder="cth: Kepala Sekolah"
                  />
                </Field>
                <Field label="NIP">
                  <Input
                    value={form.signerNip}
                    onChange={(e) => setForm({ ...form, signerNip: e.target.value })}
                    placeholder="cth: 1980..."
                  />
                </Field>
              </div>
            </div>

            <Field label={`Ujian dalam event (${form.examIds.length} dipilih)`}>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-300 p-2">
                {exams.length === 0 ? (
                  <p className="px-2 py-1 text-sm text-slate-400">Belum ada ujian. Buat ujian dulu di menu Ujian.</p>
                ) : (
                  exams.map((exam) => (
                    <label key={exam.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={form.examIds.includes(exam.id)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            examIds: e.target.checked
                              ? [...form.examIds, exam.id]
                              : form.examIds.filter((v) => v !== exam.id),
                          })
                        }
                        className="h-4 w-4 accent-indigo-600"
                      />
                      <span className="text-sm text-slate-600">{exam.title}</span>
                    </label>
                  ))
                )}
              </div>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!form.title.trim() || !form.schoolName.trim()}
              >
                Simpan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
