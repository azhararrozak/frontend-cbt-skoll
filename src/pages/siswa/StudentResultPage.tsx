import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, EyeOff, Target, Trophy, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Card, ErrorNote, PageLoading } from '../../components/ui';
import { MathText } from '../../components/MathText';
import { errorMessage, formatDateTime } from '../../lib/format';
import type { SessionResult } from '../../types';

function correctLabel(answer: string, options: string[]): string {
  const idx = Number(answer);
  if (options.length > 0 && Number.isInteger(idx) && idx >= 0 && idx < options.length) {
    return `${String.fromCharCode(65 + idx)}. ${options[idx]}`;
  }
  return answer;
}

export function StudentResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<SessionResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .sessionResult(Number(sessionId))
      .then((res) => active && setData(res.data!))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <PageLoading />;

  const correctCount = data.answers.filter((a) => a.isCorrect).length;
  const percentage =
    data.totalPoints > 0 ? Math.round((data.score / data.totalPoints) * 100) : 0;
  const passed = percentage >= 60;
  const scoreHidden = data.showScore === false;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/siswa" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
      </Link>

      {/* Ringkasan nilai */}
      {scoreHidden ? (
        <Card className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <EyeOff className="h-8 w-8" />
          </div>
          <p className="text-sm text-slate-500">Ujian Anda sudah selesai dikerjakan</p>
          <p className="mt-1 text-sm text-slate-400">
            Nilai tidak ditampilkan sesuai pengaturan ujian. Nilai akan diumumkan oleh guru/pengawas.
          </p>
          <p className="mt-2 text-xs text-slate-400">Diselesaikan {formatDateTime(data.finishedAt)}</p>
        </Card>
      ) : (
        <Card className="mb-5 text-center">
          <div
            className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full ${
              passed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            <Trophy className="h-8 w-8" />
          </div>
          <p className="text-sm text-slate-500">Nilai Akhir Anda</p>
          <p className="text-4xl font-bold text-slate-800">
            {data.score}
            <span className="text-xl font-medium text-slate-400"> / {data.totalPoints}</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {percentage}% · {correctCount} dari {data.totalQuestions} soal benar
          </p>
          <p className="mt-2 text-xs text-slate-400">Diselesaikan {formatDateTime(data.finishedAt)}</p>
        </Card>
      )}

      {/* Rincian per soal (disembunyikan juga saat skor dirahasiakan) */}
      {!scoreHidden && (
        <>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-700">
            <Target className="h-4.5 w-4.5" /> Pembahasan Jawaban
          </h2>
          <div className="space-y-3">
        {data.answers.map((a, idx) => (
          <Card key={a.questionId} className="flex gap-4">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                a.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}
            >
              {a.isCorrect ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-400">Soal {idx + 1}</span>
                <Badge tone={a.isCorrect ? 'green' : 'red'}>
                  {a.pointsEarned}/{a.points} poin
                </Badge>
              </div>
              <p className="font-medium text-slate-700">
                <MathText text={a.questionText} />
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="text-slate-400">Jawaban Anda: </span>
                  <span className={a.isCorrect ? 'font-medium text-emerald-700' : 'font-medium text-rose-700'}>
                    {a.answer !== null ? (
                      <MathText text={correctLabel(a.answer, a.options)} />
                    ) : (
                      <span className="text-slate-400 italic">tidak dijawab</span>
                    )}
                  </span>
                </p>
                {!a.isCorrect && (
                  <p>
                    <span className="text-slate-400">Kunci jawaban: </span>
                    <span className="font-medium text-emerald-700">
                      <MathText text={correctLabel(a.correctAnswer, a.options)} />
                    </span>
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
          </div>
        </>
      )}
    </div>
  );
}
