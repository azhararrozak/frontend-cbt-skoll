import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  LogOut,
  Save,
  WifiOff,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAnswerSaver, useCountdown } from '../../hooks/useAnswerSaver';
import { Button, ErrorNote, Modal, PageLoading, Spinner } from '../../components/ui';
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
  const [finishError, setFinishError] = useState('');
  const finishingRef = useRef(false);

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

  const urgent = remaining <= 300;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header ujian + timer */}
      <div className="sticky top-[57px] z-20 -mx-4 mb-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-bold text-slate-800">{detail.exam.title}</h1>
            <p className="text-xs text-slate-400">
              Terjawab {answeredCount}/{questions.length} soal
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-lg font-bold tabular-nums ${
              urgent ? 'animate-pulse bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            <Clock className="h-4.5 w-4.5" />
            {formatDuration(remaining)}
          </div>
        </div>
      </div>

      {urgent && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Waktu hampir habis! Jawaban otomatis terkirim saat Anda berhenti mengubahnya selama 1 detik.
        </div>
      )}

      {/* Navigasi nomor soal */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {questions.map((item, idx) => {
          const isAnswered = answers[item.id] !== undefined;
          const isCurrent = idx === current;
          return (
            <button
              key={item.id}
              onClick={() => setCurrent(idx)}
              className={`h-9 w-9 cursor-pointer rounded-lg text-sm font-semibold transition-colors ${
                isCurrent
                  ? 'bg-indigo-600 text-white'
                  : isAnswered
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Kartu soal */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400">
            Soal {current + 1} dari {questions.length} · {q.points} poin
          </span>
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
        </div>

        <p className="mb-5 whitespace-pre-wrap font-medium text-slate-800">{q.questionText}</p>

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
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Navigasi prev/next */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            <ChevronLeft className="h-4 w-4" /> Sebelumnya
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => c + 1)}>
              Selanjutnya <ChevronRight className="h-4 w-4" />
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
        <div className="mt-4 flex justify-end">
          <Button variant="success" onClick={() => setConfirming(true)}>
            <LogOut className="h-4 w-4" /> Selesai &amp; Kirim
          </Button>
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
            <Button variant="success" className="flex-1" onClick={() => void doFinish(false)}>
              Ya, Selesai
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
