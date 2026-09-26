import { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { saveBlob } from '../lib/api';
import type { ApiSuccess, ImportSummary } from '../types';
import { Button, ErrorNote, Modal } from './ui';
import { errorMessage } from '../lib/format';

interface ImportExcelModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Penjelasan kolom/format yang harus diisi di file */
  columnsHint: string[];
  onDownloadTemplate: () => Promise<{ blob: Blob; filename: string }>;
  onUpload: (file: File) => Promise<ApiSuccess<ImportSummary>>;
  onSuccess: () => void;
  /** Ekstensi file yang diterima, cth: '.xlsx' (default) atau '.docx' */
  accept?: string;
  labelFile?: string;
}

export function ImportExcelModal({
  open,
  onClose,
  title,
  columnsHint,
  onDownloadTemplate,
  onUpload,
  onSuccess,
  accept = '.xlsx',
  labelFile,
}: ImportExcelModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ApiSuccess<ImportSummary> | null>(null);

  const reset = () => {
    setFile(null);
    setError('');
    setResult(null);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    if (result) onSuccess(); // muat ulang data di halaman
    reset();
    onClose();
  };

  const handleTemplate = async () => {
    setDownloading(true);
    setError('');
    try {
      const { blob, filename } = await onDownloadTemplate();
      saveBlob(blob, filename);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const summary = await onUpload(file);
      setResult(summary);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={result ? 'Hasil Import' : title}>
      {result?.data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{result.data.created}</p>
              <p className="text-xs text-emerald-700">berhasil dibuat</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{result.data.skipped}</p>
              <p className="text-xs text-amber-700">dilewati</p>
            </div>
          </div>

          {typeof result.data.classesCreated === 'number' && result.data.classesCreated > 0 && (
            <p className="text-sm text-slate-500">
              {result.data.classesCreated} kelas baru dibuat otomatis dari kolom kelas.
            </p>
          )}

          {typeof result.data.linked === 'number' && result.data.linked > 0 && (
            <p className="text-sm text-slate-500">
              {result.data.linked} siswa digabungkan ke kelas.
            </p>
          )}

          {result.data.errors.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600">Catatan per baris:</p>
              <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 text-xs text-slate-500">
                {result.data.errors.map((e, i) => (
                  <li key={i}>
                    Baris {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button className="w-full" onClick={handleClose}>
            Selesai
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <ErrorNote>{error}</ErrorNote>

          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-1 text-sm font-medium text-slate-600">
              {accept.includes('docx') ? 'Format dokumen Word:' : 'Format kolom Excel:'}
            </p>
            <p className="text-xs leading-relaxed text-slate-500">{columnsHint.join(' · ')}</p>
            <Button
              variant="secondary"
              onClick={handleTemplate}
              loading={downloading}
              className="mt-2 w-full"
            >
              <Download className="h-4 w-4" /> Unduh Template Excel
            </Button>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
          >
            <FileSpreadsheet className="h-8 w-8 text-slate-400" />
            {file ? (
              <span className="text-sm font-medium text-indigo-600">{file.name}</span>
            ) : (
              <span className="text-sm text-slate-500">
                {labelFile ?? `Klik untuk pilih file ${accept}`}
              </span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Batal
            </Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!file}>
              <Upload className="h-4 w-4" /> Import
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
