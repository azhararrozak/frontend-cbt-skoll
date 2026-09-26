import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  CalendarRange,
  Download,
  FileText,
  IdCard,
  ImageUp,
  ListChecks,
  Trash2,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoading,
  Select,
  Textarea,
} from '../../components/ui';
import { errorMessage, formatDateTime } from '../../lib/format';
import type { ClassRoom, DocumentFormat, EventDetail, EventDocKind } from '../../types';

const DOCS: { kind: EventDocKind; label: string; desc: string; icon: typeof FileText; needClass: boolean }[] = [
  { kind: 'kartu-peserta', label: 'Kartu Peserta', desc: 'Kartu login siswa berisi identitas, nomor meja & jadwal ujian', icon: IdCard, needClass: false },
  { kind: 'daftar-hadir', label: 'Daftar Hadir', desc: 'Absensi peserta per kelas/ruang dengan kolom tanda tangan', icon: ListChecks, needClass: true },
  { kind: 'nomor-meja', label: 'Nomor Meja', desc: 'Kartu nomor meja berukuran besar untuk ditempel di meja', icon: FileText, needClass: true },
];

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [error, setError] = useState('');

  // editor kop & signer
  const [kop, setKop] = useState({
    schoolName: '',
    schoolAddress: '',
    academicYear: '',
    signerName: '',
    signerTitle: '',
    signerNip: '',
  });
  const [savingKop, setSavingKop] = useState(false);
  const [kopMsg, setKopMsg] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // kelola ujian
  const [showExams, setShowExams] = useState(false);
  const [allExams, setAllExams] = useState<{ id: number; title: string }[]>([]);
  const [selectedExams, setSelectedExams] = useState<number[]>([]);
  const [savingExams, setSavingExams] = useState(false);

  // dokumen
  const [classId, setClassId] = useState('');
  const [format, setFormat] = useState<DocumentFormat>('pdf');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [docError, setDocError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.getEvent(eventId);
      const d = res.data!;
      setEvent(d);
      setKop({
        schoolName: d.schoolName,
        schoolAddress: d.schoolAddress ?? '',
        academicYear: d.academicYear ?? '',
        signerName: d.signerName ?? '',
        signerTitle: d.signerTitle ?? '',
        signerNip: d.signerNip ?? '',
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [eventId]);

  useEffect(() => {
    let active = true;
    api
      .getEvent(eventId)
      .then((res) => {
        if (!active) return;
        const d = res.data!;
        setEvent(d);
        setKop({
          schoolName: d.schoolName,
          schoolAddress: d.schoolAddress ?? '',
          academicYear: d.academicYear ?? '',
          signerName: d.signerName ?? '',
          signerTitle: d.signerTitle ?? '',
          signerNip: d.signerNip ?? '',
        });
      })
      .catch((err) => active && setError(errorMessage(err)));
    api
      .listClasses({ limit: 100 })
      .then((r) => active && setClasses(r.data ?? []))
      .catch(() => {});
    api
      .listExams({ limit: 100 })
      .then((r) => active && setAllExams((r.data ?? []).map((e) => ({ id: e.id, title: e.title }))))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [eventId]);

  const saveKop = async () => {
    setSavingKop(true);
    setKopMsg('');
    try {
      await api.updateEvent(eventId, {
        schoolName: kop.schoolName.trim(),
        schoolAddress: kop.schoolAddress.trim() || undefined,
        academicYear: kop.academicYear.trim() || undefined,
        signerName: kop.signerName.trim() || undefined,
        signerTitle: kop.signerTitle.trim() || undefined,
        signerNip: kop.signerNip.trim() || undefined,
      });
      setKopMsg('Kop & data penandatangan tersimpan.');
      await load();
    } catch (err) {
      setKopMsg(errorMessage(err));
    } finally {
      setSavingKop(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    setKopMsg('');
    try {
      await api.uploadEventLogo(eventId, file);
      await load();
    } catch (err) {
      setKopMsg(errorMessage(err));
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    if (!confirm('Hapus logo kop?')) return;
    setUploadingLogo(true);
    try {
      await api.removeEventLogo(eventId);
      await load();
    } catch (err) {
      setKopMsg(errorMessage(err));
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveExams = async () => {
    setSavingExams(true);
    try {
      await api.updateEvent(eventId, { examIds: selectedExams });
      setShowExams(false);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingExams(false);
    }
  };

  const downloadDoc = async (kind: EventDocKind, label: string) => {
    setDownloading(kind);
    setDocError('');
    try {
      const { blob, filename } = await api.downloadEventDoc(
        eventId,
        kind,
        kind === 'kartu-peserta' ? (classId ? Number(classId) : undefined) : Number(classId),
        format,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDocError(`${label}: ${errorMessage(err)}`);
    } finally {
      setDownloading(null);
    }
  };

  if (error && !event) return <ErrorNote>{error}</ErrorNote>;
  if (!event) return <PageLoading />;

  const eventClassIds = new Set(event.classIds);

  return (
    <>
      <Link to="/app/event" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Event
      </Link>

      <PageHeader
        title={event.title}
        subtitle={event.description ?? 'Kelola kop, ujian, dan dokumen cetak peserta'}
      />

      <ErrorNote>{error}</ErrorNote>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor Kop */}
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <CalendarRange className="h-4.5 w-4.5 text-indigo-600" /> Kop Dokumen
          </h2>
          <div className="space-y-3">
            {/* Pratinjau kop */}
            <div className="flex items-center gap-3 rounded-lg border-b-2 border-slate-300 pb-3">
              {event.logo ? (
                <img src={event.logo} alt="Logo" className="h-16 w-16 object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                  Logo
                </div>
              )}
              <div className="min-w-0 flex-1 text-center">
                <p className="font-bold uppercase text-slate-800">{kop.schoolName || 'Nama Sekolah'}</p>
                <p className="text-xs text-slate-500">{kop.schoolAddress}</p>
              </div>
              <div className="w-16" />
            </div>

            <Field label="Nama sekolah">
              <Input value={kop.schoolName} onChange={(e) => setKop({ ...kop, schoolName: e.target.value })} />
            </Field>
            <Field label="Alamat sekolah">
              <Textarea value={kop.schoolAddress} onChange={(e) => setKop({ ...kop, schoolAddress: e.target.value })} className="min-h-[60px]" />
            </Field>
            <Field label="Tahun pelajaran">
              <Input value={kop.academicYear} onChange={(e) => setKop({ ...kop, academicYear: e.target.value })} placeholder="cth: 2026/2027" />
            </Field>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Penandatangan Dokumen (opsional)</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Field label="Nama Pejabat">
                  <Input
                    value={kop.signerName}
                    onChange={(e) => setKop({ ...kop, signerName: e.target.value })}
                    placeholder="cth: Drs. H. Ahmad"
                  />
                </Field>
                <Field label="Jabatan">
                  <Input
                    value={kop.signerTitle}
                    onChange={(e) => setKop({ ...kop, signerTitle: e.target.value })}
                    placeholder="cth: Kepala Sekolah"
                  />
                </Field>
                <Field label="NIP">
                  <Input
                    value={kop.signerNip}
                    onChange={(e) => setKop({ ...kop, signerNip: e.target.value })}
                    placeholder="cth: 1980..."
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
              />
              <Button variant="secondary" loading={uploadingLogo} onClick={() => logoInputRef.current?.click()}>
                <ImageUp className="h-4 w-4" /> {event.logo ? 'Ganti Logo' : 'Unggah Logo'}
              </Button>
              {event.logo && (
                <Button variant="ghost" onClick={handleLogoRemove} className="text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" /> Hapus Logo
                </Button>
              )}
              <Button onClick={saveKop} loading={savingKop} disabled={kop.schoolName.trim().length < 2} className="ml-auto">
                Simpan Kop
              </Button>
            </div>
            {kopMsg && <p className="text-xs text-slate-500">{kopMsg}</p>}
          </div>
        </Card>

        {/* Ujian dalam event */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-700">
              <ListChecks className="h-4.5 w-4.5 text-indigo-600" /> Ujian dalam Event ({event.exams.length})
            </h2>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedExams(event.exams.map((e) => e.id));
                setShowExams(true);
              }}
              className="px-3 py-1.5 text-xs"
            >
              Kelola Ujian
            </Button>
          </div>
          {event.exams.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Belum ada ujian. Tambahkan ujian agar bisa mencetak dokumen peserta.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {event.exams.map((exam) => (
                <li key={exam.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">{exam.title}</p>
                    <p className="text-xs text-slate-400">
                      {exam.classNames} · {exam.durationMinutes} menit ·{' '}
                      {exam.startAt ? formatDateTime(exam.startAt) : 'tanpa jadwal'}
                    </p>
                  </div>
                  <Badge tone={exam.isPublished ? 'green' : 'yellow'}>
                    {exam.isPublished ? 'Terpublikasi' : 'Draf'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Dokumen cetak */}
      <div className="mt-4">
        <h2 className="mb-1 font-semibold text-slate-700">Dokumen Cetak Peserta</h2>
        <p className="mb-3 text-sm text-slate-500">
          Format PDF (2 kolom per lembar, rapi) atau Word (.docx) dapat dipilih. Nomor meja diurutkan otomatis sesuai abjad nama siswa.
        </p>
        <ErrorNote>{docError}</ErrorNote>

        <div className="mt-3 mb-4 flex flex-wrap items-end gap-4">
          <div className="w-full max-w-xs">
            <Field label="Pilih kelas / ruang" hint="Kartu peserta tanpa kelas = semua kelas peserta event">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">— pilih kelas —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {eventClassIds.has(c.id) ? ' (peserta event)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Format File</label>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  format === 'pdf'
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PDF (.pdf) <span className="text-[10px] text-indigo-500 font-normal">★ Rekomendasi</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('docx')}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  format === 'docx'
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Word (.docx)
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {DOCS.map(({ kind, label, desc, icon: Icon, needClass }) => {
            const disabled = downloading !== null || (needClass && !classId);
            return (
              <Card key={kind} className="flex flex-col">
                <Icon className="mb-2 h-6 w-6 text-indigo-600" />
                <p className="font-semibold text-slate-800">{label}</p>
                <p className="mb-3 flex-1 text-sm text-slate-500">{desc}</p>
                <Button
                  onClick={() => downloadDoc(kind, label)}
                  disabled={disabled}
                  loading={downloading === kind}
                  className="w-full"
                >
                  <Download className="h-4 w-4" /> Unduh
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal kelola ujian */}
      <Modal open={showExams} onClose={() => setShowExams(false)} title="Kelola Ujian dalam Event" wide>
        <div className="space-y-4">
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-300 p-2">
            {allExams.map((exam) => (
              <label key={exam.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedExams.includes(exam.id)}
                  onChange={(e) =>
                    setSelectedExams((prev) =>
                      e.target.checked ? [...prev, exam.id] : prev.filter((v) => v !== exam.id),
                    )
                  }
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm text-slate-600">{exam.title}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowExams(false)}>Batal</Button>
            <Button onClick={saveExams} loading={savingExams}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
