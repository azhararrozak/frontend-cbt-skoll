import { useRef, useState } from 'react';
import { DatabaseBackup, Download, RotateCcw, ShieldCheck, TriangleAlert, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { saveBlob } from '../../lib/api';
import { Button, Card, ErrorNote, Input, PageHeader } from '../../components/ui';
import { errorMessage } from '../../lib/format';

const TABLE_LABELS: Record<string, string> = {
  users: 'Akun (admin/guru/siswa)',
  classes: 'Kelas',
  class_members: 'Anggota kelas',
  question_banks: 'Bank soal',
  questions: 'Soal',
  exams: 'Ujian',
  exam_sessions: 'Sesi ujian siswa',
  exam_answers: 'Jawaban siswa',
};

export function BackupPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState<Record<string, number> | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const { blob, filename } = await api.downloadBackup();
      saveBlob(blob, filename);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleRestore = async () => {
    if (!file || confirmText !== 'RESTORE') return;
    if (!confirm('Semua data saat ini akan DIGANTI dengan isi file backup. Lanjutkan?')) return;
    setRestoring(true);
    setError('');
    try {
      const res = await api.restoreBackup(file);
      setRestored(res.data ?? null);
      setFile(null);
      setConfirmText('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Backup Data"
        subtitle="Amankan seluruh data sekolah, dan pulihkan bila terjadi kesalahan"
      />

      <ErrorNote>{error}</ErrorNote>

      {/* Download backup */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <DatabaseBackup className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Unduh Backup</h2>
              <p className="mt-0.5 max-w-md text-sm text-slate-500">
                Semua data (akun, kelas, bank soal, ujian, hingga jawaban siswa) akan diunduh
                sebagai satu file JSON. Simpan file ini di tempat aman.
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Data login/refresh token tidak disertakan
                untuk keamanan.
              </p>
            </div>
          </div>
          <Button onClick={handleDownload} loading={downloading}>
            <Download className="h-4 w-4" /> Download Backup
          </Button>
        </div>
      </Card>

      {/* Restore */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-800">Pulihkan dari Backup</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Unggah file backup JSON untuk mengembalikan data ke kondisi saat backup dibuat.
            </p>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Hati-hati:</strong> seluruh data saat ini akan dihapus dan diganti dengan
                isi file backup. Tindakan ini tidak bisa dibatalkan.
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
              >
                <Upload className="h-4 w-4" />
                {file ? <span className="font-medium text-indigo-600">{file.name}</span> : 'Pilih file backup (.json)'}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />

              {file && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder='Ketik "RESTORE" untuk konfirmasi'
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                    className="max-w-xs"
                  />
                  <Button variant="danger" onClick={handleRestore} loading={restoring} disabled={confirmText !== 'RESTORE'}>
                    <RotateCcw className="h-4 w-4" /> Pulihkan Sekarang
                  </Button>
                </div>
              )}
            </div>

            {restored && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-2 font-medium text-emerald-700">
                  Data berhasil dipulihkan. Jumlah baris yang dikembalikan:
                </p>
                <ul className="grid gap-1 text-sm text-emerald-700 sm:grid-cols-2">
                  {Object.entries(restored).map(([key, count]) => (
                    <li key={key}>
                      {TABLE_LABELS[key] ?? key}: <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-emerald-600">
                  Semua pengguna perlu login ulang setelah pemulihan.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
