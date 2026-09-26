import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  LayoutGrid,
  Loader2,
  Lock,
  LogOut,
  Save,
  WifiOff,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAnswerSaver, useCountdown } from '../../hooks/useAnswerSaver';
import { Button, ErrorNote, Modal, PageLoading, Spinner } from '../../components/ui';
import { MathText } from '../../components/MathText';
import { errorMessage, formatDuration } from '../../lib/format';
import type { SessionDetail } from '../../types';

const SAVE_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: 'Menyimpan otomatis...', className: 'text-amber-600' },
  saving: { text: 'Menyimpan...', className: 'text-amber-600' },
  saved: { text: 'Tersimpan', className: 'text-emerald-600' },
  error: { text: 'Gagal tersimpan — pilih ulang jawaban', className: 'text-rose-600' },
};

export function ExamPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = Number(sessionId);
  const navigate = useNavigate();

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState('');

  // ---- Muat detail sesi (soal + jawaban tersimpan + sisa waktu) ----
  useEffect(() => {
    let active = true;
    api
      .sessionDetail(id)
      .then((res) => {
        if (!active) return;
        const d = res.data!;
        if (d.session.status === 'completed') {
          navigate(`/siswa/hasil/${id}`, { replace: true });
          return;
        }
        setDetail(d);
      })
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [id, navigate]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16">
        <ErrorNote>{error}</ErrorNote>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/siswa')}>
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }
  if (!detail) return <PageLoading />;

  // Runner baru dimuat setelah data siap, sehingga countdown memakai sisa waktu dari server
  return <ExamRunner detail={detail} />;
}

function ExamRunner({ detail }: { detail: SessionDetail }) {
  const id = detail.session.id;
  const navigate = useNavigate();

  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const q of detail.questions) {
      if (q.answer !== null) initial[q.id] = q.answer;
    }
    return initial;
  });
  const [current, setCurrent] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [finishError, setFinishError] = useState('');
  const finishingRef = useRef(false);

  const [flags, setFlags] = useState<Set<number>>(
    () => new Set(detail.session.flaggedQuestions),
  );

  const saver = useAnswerSaver(id);

  const questions = useMemo(() => detail.questions, [detail]);
  const q = questions[current];

  // ---- Selesaikan ujian: kirim sisa jawaban lalu finalize ----
  const doFinish = useCallback(
    async (auto: boolean) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setFinishError('');
      try {
        await saver.flushAll();
        await api.finishSession(id);
        navigate(`/siswa/hasil/${id}`, { replace: true });
      } catch (err) {
        finishingRef.current = false;
        if (!auto) setFinishError(errorMessage(err));
        else
          setFinishError(
            'Waktu habis namun gagal menyelesaikan ujian otomatis. Klik "Selesai" untuk mencoba lagi.',
          );
      }
    },
    [id, navigate, saver],
  );

  const remaining = useCountdown(detail.session.remainingSeconds, () => {
    void doFinish(true);
  });

  // Kunci "Selesai" sampai waktu minimal pengerjaan tercapai
  const [unlockSeconds] = useState(() => {
    const { minSubmitMinutes, startedAt } = detail.session;
    if (minSubmitMinutes <= 0) return 0;
    const canFinishAt = Date.parse(startedAt) + minSubmitMinutes * 60000;
    return Math.max(0, Math.round((canFinishAt - Date.now()) / 1000));
  });
  const submitUnlockRemaining = useCountdown(unlockSeconds, () => {});
  const submitLocked = submitUnlockRemaining > 0;

  // ---- Peringatkan saat menutup tab di tengah ujian ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const answeredCount = useMemo(
    () => questions.filter((item) => answers[item.id] !== undefined).length,
    [questions, answers],
  );

  const setAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    saver.queue(questionId, value);
  };

  // ---- Tandai ragu-ragu (tersimpan ke server) ----
  const toggleFlag = async (questionId: number) => {
    const flagged = !flags.has(questionId);
    setFlags((prev) => {
      const next = new Set(prev);
      if (flagged) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
    try {
      await api.setFlag(id, questionId, flagged);
    } catch {
      // Gagal simpan: kembalikan tampilan agar sesuai server
      setFlags((prev) => {
        const next = new Set(prev);
        if (flagged) next.delete(questionId);
        else next.add(questionId);
        return next;
      });
    }
  };

  const urgent = remaining <= 300;

  const gridBtnClass = (isCurrent: boolean, isAnswered: boolean, isFlagged: boolean) =>
    `relative h-11 w-full cursor-pointer rounded-lg text-sm font-semibold transition-colors ${
      isCurrent
        ? 'bg-indigo-600 text-white'
        : isAnswered
          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    } ${isFlagged && !isCurrent ? 'ring-2 ring-amber-400' : ''}`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header ujian + timer (sticky, mobile friendly) */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-800 sm:text-base">
              {detail.exam.title}
            </h1>
            <p className="text-xs text-slate-400">
              Terjawab {answeredCount}/{questions.length} soal
              {flags.size > 0 && ` · ${flags.size} ragu-ragu`}
            </p>
          </div>
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-base font-bold tabular-nums sm:text-lg ${
              urgent ? 'animate-pulse bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            {formatDuration(remaining)}
          </div>
        </div>
      </div>

      {/* Buka daftar soal (grid) */}
      <button
        onClick={() => setShowGrid(true)}
        className="mb-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-indigo-300 sm:mb-4"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-indigo-700">
          <LayoutGrid className="h-4.5 w-4.5" /> Daftar Soal
        </span>
        <span className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-indigo-500" /> {answeredCount} terjawab
          </span>
          {flags.size > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-amber-400" /> {flags.size} ragu
            </span>
          )}
        </span>
      </button>

      {urgent && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 sm:mb-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Waktu hampir habis! Jawaban otomatis terkirim saat Anda berhenti mengubahnya selama 1 detik.
        </div>
      )}

      {submitLocked && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-700 sm:mb-4">
          <Clock className="h-4 w-4 shrink-0" />
          Jawaban bisa dikumpulkan mulai menit ke-{detail.session.minSubmitMinutes} — masih
          terkunci <strong className="tabular-nums">{formatDuration(submitUnlockRemaining)}</strong>.
          Lanjutkan mengerjakan sambil memeriksa kembali jawaban Anda.
        </div>
      )}

      {/* Kartu soal */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-400">
            Soal {current + 1} dari {questions.length} · {q.points} poin
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {saver.statuses[q.id] && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${SAVE_LABELS[saver.statuses[q.id]].className}`}
              >
                {saver.statuses[q.id] === 'saving' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saver.statuses[q.id] === 'saved' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : saver.statuses[q.id] === 'error' ? (
                  <WifiOff className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {SAVE_LABELS[saver.statuses[q.id]].text}
              </span>
            )}
            <button
              onClick={() => toggleFlag(q.id)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                flags.has(q.id)
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Flag
                className={`h-3.5 w-3.5 ${flags.has(q.id) ? 'fill-amber-400 text-amber-500' : ''}`}
              />
              {flags.has(q.id) ? 'Ragu-ragu' : 'Tandai ragu'}
            </button>
          </div>
        </div>

        <p className="mb-5 font-medium text-slate-800">
          <MathText text={q.questionText} />
        </p>

        {q.type === 'short_answer' ? (
          <input
            type="text"
            value={answers[q.id] ?? ''}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder="Ketik jawaban Anda di sini..."
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        ) : (
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === String(i);
              return (
                <button
                  key={i}
                  onClick={() => setAnswer(q.id, String(i))}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 font-medium text-indigo-800'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                      selected
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <MathText text={opt} />
                </button>
              );
            })}
          </div>
        )}

        {/* Navigasi prev/next */}
        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
          <Button
            variant="secondary"
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => c + 1)}>
              Selanjutnya <ChevronRight className="h-4 w-4" />
            </Button>
          ) : submitLocked ? (
            <Button variant="success" disabled title="Tunggu sampai waktu minimal pengerjaan tercapai">
              <Lock className="h-4 w-4" /> {formatDuration(submitUnlockRemaining)}
            </Button>
          ) : (
            <Button variant="success" onClick={() => setConfirming(true)}>
              <LogOut className="h-4 w-4" /> Selesai &amp; Kirim
            </Button>
          )}
        </div>
      </div>

      {/* Tombol selesai melayang */}
      {current < questions.length - 1 && (
        <div className="mt-4">
          {submitLocked ? (
            <Button variant="success" disabled className="w-full sm:w-auto" title="Tunggu sampai waktu minimal pengerjaan tercapai">
              <Lock className="h-4 w-4" /> Terkunci {formatDuration(submitUnlockRemaining)}
            </Button>
          ) : (
            <Button variant="success" className="w-full sm:w-auto" onClick={() => setConfirming(true)}>
              <LogOut className="h-4 w-4" /> Selesai &amp; Kirim
            </Button>
          )}
        </div>
      )}

      {finishError && (
        <div className="mt-4">
          <ErrorNote>{finishError}</ErrorNote>
          <Button className="mt-2 w-full" onClick={() => void doFinish(false)}>
            <Spinner className="h-4 w-4" /> Coba Selesaikan Lagi
          </Button>
        </div>
      )}

      {/* Modal daftar soal (grid) */}
      <Modal open={showGrid} onClose={() => setShowGrid(false)} title="Daftar Soal">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {questions.map((item, idx) => {
            const isAnswered = answers[item.id] !== undefined;
            const isFlagged = flags.has(item.id);
            const isCurrent = idx === current;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrent(idx);
                  setShowGrid(false);
                }}
                className={gridBtnClass(isCurrent, isAnswered, isFlagged)}
                title={isFlagged ? 'Ditandai ragu-ragu' : isAnswered ? 'Sudah dijawab' : 'Belum dijawab'}
              >
                {idx + 1}
                {isFlagged && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Keterangan warna */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-indigo-600" /> Sedang dikerjakan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-indigo-100" /> Terjawab
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-slate-100" /> Belum dijawab
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-400" /> Ragu-ragu
          </span>
        </div>

        <div className="mt-5">
          {submitLocked ? (
            <p className="text-center text-xs text-slate-400">
              Jawaban bisa dikumpulkan dalam{' '}
              <strong className="tabular-nums">{formatDuration(submitUnlockRemaining)}</strong>
            </p>
          ) : (
            <Button
              variant="success"
              className="w-full"
              onClick={() => {
                setShowGrid(false);
                setConfirming(true);
              }}
            >
              <LogOut className="h-4 w-4" /> Selesai &amp; Kirim
            </Button>
          )}
        </div>
      </Modal>

      {/* Modal konfirmasi selesai */}
      <Modal open={confirming} onClose={() => setConfirming(false)} title="Selesaikan Ujian?">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {answeredCount < questions.length ? (
              <span className="font-medium text-amber-600">
                Anda belum menjawab {questions.length - answeredCount} soal. Soal yang tidak dijawab
                dinilai 0.
              </span>
            ) : (
              'Semua soal sudah terjawab. Jawaban Anda akan dikirim dan dinilai.'
            )}
          </p>
          <p className="text-xs text-slate-400">
            Setelah diselesaikan, Anda tidak dapat kembali mengerjakan ujian ini.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
              Periksa Lagi
            </Button>
            {submitLocked ? (
              <Button variant="success" className="flex-1" disabled>
                <Lock className="h-4 w-4" /> Terkunci {formatDuration(submitUnlockRemaining)}
              </Button>
            ) : (
              <Button variant="success" className="flex-1" onClick={() => void doFinish(false)}>
                Ya, Selesai
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
