import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Eye, RotateCcw, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Button, Card, ErrorNote, PageLoading } from '../../components/ui';
import { errorMessage, formatDateTime, formatDuration } from '../../lib/format';
import type { ExamMonitorRow, ExamMonitoring } from '../../types';

export function ExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ExamMonitoring | null>(null);
  const [error, setError] = useState('');
  const [busySession, setBusySession] = useState<number | null>(null);
  // Tick 1 detik untuk countdown sisa waktu + polling data tiap 15 detik
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const res = await api.examMonitoring(Number(id));
      setData(res.data!);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    api
      .examMonitoring(Number(id))
      .then((res) => {
        if (active) setData(res.data!);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => load(), 15000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [load]);

  const forceFinish = async (row: ExamMonitorRow) => {
    if (!data) return;
    if (
      !confirm(
        `Selesaikan PAKSA ujian ${row.studentName}?\n\n` +
          `Nilai dihitung dari jawaban yang sudah tersimpan (${row.answeredCount}/${data.totalQuestions} soal). ` +
          'Siswa tidak bisa melanjutkan setelah ini.',
      )
    )
      return;
    setBusySession(row.sessionId);
    setError('');
    try {
      await api.forceFinishSession(row.sessionId);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusySession(null);
    }
  };

  const resetSession = async (row: ExamMonitorRow) => {
    if (
      !confirm(
        `RESET sesi ujian ${row.studentName}?\n\n` +
          'Seluruh jawaban dan nilai sesi ini akan DIHAPUS,\n' +
          'lalu siswa dapat memulai ulang ujian dari awal dengan token.',
      )
    )
      return;
    setBusySession(row.sessionId);
    setError('');
    try {
      await api.resetSession(row.sessionId);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusySession(null);
    }
  };

  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <PageLoading />;

  const inProgress = data.rows.filter((r) => r.status === 'in_progress');
  const completed = data.rows.filter((r) => r.status === 'completed');
  const avg =
    completed.length > 0
      ? Math.round(completed.reduce((s, r) => s + r.score, 0) / completed.length)
      : 0;

  return (
    <>
      <Link to="/app/ujian" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Ujian
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Pantau — {data.exam.title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {data.totalQuestions} soal · total {data.totalPoints} poin · diperbarui otomatis tiap 15 detik
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card>
          <p className="text-sm text-slate-500">Berlangsung</p>
          <p className="text-2xl font-bold text-indigo-600">{inProgress.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Selesai</p>
          <p className="text-2xl font-bold text-slate-800">
            {completed.length}
            <span className="text-base text-slate-400">/{data.rows.length}</span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Rata-rata nilai</p>
          <p className="text-2xl font-bold text-slate-800">{avg}</p>
        </Card>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {data.rows.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-400">
            Belum ada siswa yang memulai ujian ini.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Siswa</th>
                <th className="px-4 py-3 font-medium">Progres</th>
                <th className="px-4 py-3 font-medium">Sisa waktu</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Nilai</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row, i) => {
                const live = row.status === 'in_progress';
                const remainSec = live
                  ? Math.max(0, Math.floor((new Date(row.expiresAt).getTime() - now) / 1000))
                  : 0;
                const pct =
                  data.totalQuestions > 0
                    ? Math.round((row.answeredCount / data.totalQuestions) * 100)
                    : 0;
                return (
                  <tr key={row.sessionId} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{row.studentName}</p>
                      <p className="text-xs text-slate-400">{row.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-slate-500">
                          {row.answeredCount}/{data.totalQuestions}
                        </span>
                        {row.flaggedCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            {row.flaggedCount} ragu
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {live ? (
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${
                            remainSec <= 300 ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {remainSec === 0 ? 'Habis' : formatDuration(remainSec)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === 'completed' ? 'green' : 'yellow'}>
                        {row.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === 'completed' ? (
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            row.score >= data.totalPoints / 2
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {row.score === data.totalPoints && data.totalPoints > 0 && (
                            <Trophy className="h-4 w-4 text-amber-500" />
                          )}
                          {row.score}
                          <span className="text-xs font-normal text-slate-400">
                            /{data.totalPoints}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {live ? (
                          <Button
                            variant="secondary"
                            loading={busySession === row.sessionId}
                            onClick={() => forceFinish(row)}
                            className="px-2.5 py-1.5 text-xs"
                            title="Hitung nilai dari jawaban tersimpan & akhiri sesi"
                          >
                            <Eye className="h-3.5 w-3.5" /> Selesaikan
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">
                            {formatDateTime(row.finishedAt)}
                          </span>
                        )}
                        <Button
                          variant="danger"
                          loading={busySession === row.sessionId}
                          onClick={() => resetSession(row)}
                          className="px-2.5 py-1.5 text-xs"
                          title="Hapus sesi agar siswa dapat mulai ulang"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
