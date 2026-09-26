import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  History,
  Hourglass,
  KeyRound,
  Lock,
  PlayCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/useAuth';
import {
  Badge,
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
import { errorMessage, formatDateTime } from '../../lib/format';
import type { AvailableExam, ExamAvailability, MySession } from '../../types';

const availabilityMeta: Record<ExamAvailability, { label: string; tone: 'green' | 'yellow' | 'red' }> = {
  open: { label: 'Dibuka', tone: 'green' },
  upcoming: { label: 'Belum dibuka', tone: 'yellow' },
  ended: { label: 'Ditutup', tone: 'red' },
};

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'jadwal' | 'riwayat'>('jadwal');
  const [exams, setExams] = useState<AvailableExam[] | null>(null);
  const [history, setHistory] = useState<MySession[] | null>(null);
  const [error, setError] = useState('');

  // modal token
  const [tokenExam, setTokenExam] = useState<AvailableExam | null>(null);
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.availableExams(), api.mySessions({ limit: 50 })])
      .then(([examsRes, historyRes]) => {
        if (!active) return;
        setExams(examsRes.data ?? []);
        setHistory(historyRes.data ?? []);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, []);

  const openTokenModal = (item: AvailableExam) => {
    setTokenExam(item);
    setToken('');
    setTokenError('');
  };

  const handleStart = async () => {
    if (!tokenExam) return;
    setStarting(true);
    setTokenError('');
    try {
      const res = await api.startExam(tokenExam.exam.id, token.trim().toUpperCase());
      navigate(`/siswa/ujian/${res.data!.sessionId}`);
    } catch (err) {
      setTokenError(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  if (error && !exams) return <ErrorNote>{error}</ErrorNote>;
  if (!exams || !history) return <PageLoading />;

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name.split(' ')[0]} 👋`}
        subtitle="Cek jadwal ujian dan kerjakan tepat waktu"
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:w-fit">
        {([
          { key: 'jadwal', label: 'Jadwal Ujian', icon: CalendarClock, count: exams.length },
          { key: 'riwayat', label: 'Riwayat', icon: History, count: history.length },
        ] as const).map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              tab === key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span className={`rounded-full px-1.5 text-xs ${tab === key ? 'bg-white/20' : 'bg-slate-100'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>

      {/* ===== Jadwal ===== */}
      {tab === 'jadwal' && (
        exams.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-10 w-10" />}
            title="Belum ada ujian"
            subtitle="Ujian dari guru Anda akan muncul di sini. Pastikan Anda sudah tergabung di kelas."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {exams.map((item) => {
              const meta = availabilityMeta[item.availability];
              const inProgress = item.mySession?.status === 'in_progress';
              const completed = item.mySession?.status === 'completed';
              return (
                <Card key={item.exam.id} className="flex flex-col">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">{item.exam.title}</p>
                      <p className="text-xs text-slate-400">{item.classNames} · {item.bankName ?? 'Soal'}</p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>

                  {item.exam.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-500">{item.exam.description}</p>
                  )}

                  <div className="mb-4 space-y-1 text-sm text-slate-500">
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      Durasi {item.exam.durationMinutes} menit
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-slate-400" />
                      {item.exam.startAt
                        ? `${formatDateTime(item.exam.startAt)} — ${formatDateTime(item.exam.endAt)}`
                        : 'Tanpa jadwal (aktif selama dipublikasi)'}
                    </p>
                  </div>

                  <div className="mt-auto">
                    {completed ? (
                      <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5">
                        <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" /> Selesai
                          {item.exam.showScore && <> · nilai {item.mySession!.score}</>}
                        </span>
                        <Button variant="secondary" onClick={() => navigate(`/siswa/hasil/${item.mySession!.id}`)} className="px-3 py-1.5 text-xs">
                          Lihat
                        </Button>
                      </div>
                    ) : inProgress ? (
                      <Button variant="success" className="w-full" onClick={() => navigate(`/siswa/ujian/${item.mySession!.id}`)}>
                        <PlayCircle className="h-4 w-4" /> Lanjutkan Ujian
                      </Button>
                    ) : item.availability === 'open' ? (
                      <Button className="w-full" onClick={() => openTokenModal(item)}>
                        <KeyRound className="h-4 w-4" /> Masuk Ujian
                      </Button>
                    ) : item.availability === 'upcoming' ? (
                      <Button variant="secondary" disabled className="w-full">
                        <Hourglass className="h-4 w-4" /> Belum dibuka
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled className="w-full">
                        <Lock className="h-4 w-4" /> Ditutup
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ===== Riwayat ===== */}
      {tab === 'riwayat' && (
        history.length === 0 ? (
          <EmptyState
            icon={<History className="h-10 w-10" />}
            title="Belum ada riwayat"
            subtitle="Ujian yang pernah Anda kerjakan akan tercatat di sini."
          />
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {history.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{s.examTitle}</p>
                  <p className="text-xs text-slate-400">Mulai {formatDateTime(s.startedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === 'completed' ? (
                    <>
                      <span className="font-bold text-emerald-600">{s.score}</span>
                      <Button variant="secondary" onClick={() => navigate(`/siswa/hasil/${s.id}`)} className="px-3 py-1.5 text-xs">
                        Lihat Hasil
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge tone="yellow">Berlangsung</Badge>
                      <Button onClick={() => navigate(`/siswa/ujian/${s.id}`)} className="px-3 py-1.5 text-xs">
                        Lanjutkan
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )
      )}

      {/* Modal token */}
      <Modal open={tokenExam !== null} onClose={() => setTokenExam(null)} title="Masukkan Token Ujian">
        {tokenExam && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="font-semibold text-slate-800">{tokenExam.exam.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">
                {tokenExam.classNames} · durasi {tokenExam.exam.durationMinutes} menit
              </p>
            </div>
            <p className="text-sm text-slate-500">
              Minta token kepada pengawas/guru Anda, lalu masukkan di bawah ini.
            </p>
            <ErrorNote>{tokenError}</ErrorNote>
            <Field label="Token">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="cth: UJIAN1"
                maxLength={10}
                autoFocus
                className="text-center font-mono text-lg font-bold tracking-[0.4em] uppercase"
                onKeyDown={(e) => e.key === 'Enter' && token.trim() && handleStart()}
              />
            </Field>
            <Button onClick={handleStart} loading={starting} disabled={!token.trim()} className="w-full">
              <PlayCircle className="h-4 w-4" /> Mulai Ujian
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
