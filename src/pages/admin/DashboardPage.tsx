import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Activity, BookOpen, ClipboardList, Eye, School, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Card, ErrorNote, PageHeader, PageLoading } from '../../components/ui';
import { formatDateTime, errorMessage } from '../../lib/format';
import { useAuth } from '../../auth/useAuth';
import type { ActiveExamSummary, ExamListItem } from '../../types';

interface Stats {
  exams: number;
  banks: number;
  classes: number;
  students: number;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<ExamListItem[]>([]);
  const [active, setActive] = useState<ActiveExamSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let activeSub = true;
    Promise.all([
      api.listExams({ limit: 5 }),
      api.listBanks({ limit: 1 }),
      api.listClasses({ limit: 1 }),
      api.listUsers({ limit: 1, role: 'siswa' }),
    ])
      .then(([exams, banks, classes, students]) => {
        if (!activeSub) return;
        setRecent(exams.data ?? []);
        setStats({
          exams: exams.pagination?.totalItems ?? 0,
          banks: banks.pagination?.totalItems ?? 0,
          classes: classes.pagination?.totalItems ?? 0,
          students: students.pagination?.totalItems ?? 0,
        });
      })
      .catch((err) => activeSub && setError(errorMessage(err)));

    // Pemantauan ujian berlangsung — muat sekarang + segarkan tiap 15 detik
    const loadActive = () =>
      api
        .activeExamSummary()
        .then((res) => activeSub && setActive(res.data ?? []))
        .catch(() => {});
    loadActive();
    const poll = setInterval(loadActive, 15000);

    return () => {
      activeSub = false;
      clearInterval(poll);
    };
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!stats) return <PageLoading />;

  const cards = [
    { label: 'Total Ujian', value: stats.exams, icon: ClipboardList, to: '/app/ujian', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Bank Soal', value: stats.banks, icon: BookOpen, to: '/app/bank-soal', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Kelas', value: stats.classes, icon: School, to: '/app/kelas', color: 'bg-amber-50 text-amber-600' },
    { label: 'Siswa', value: stats.students, icon: Users, to: '/app/pengguna', color: 'bg-sky-50 text-sky-600' },
  ];

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${user?.name.split(' ')[0]} 👋`}
        subtitle="Ringkasan aktivitas CBT sekolah Anda"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, to, color }) => (
          <Link key={label} to={to}>
            <Card className="transition-shadow hover:shadow-md">
              <div className={`mb-3 inline-flex rounded-lg p-2 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-sm text-slate-500">{label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Ujian yang sedang berlangsung */}
      {active.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-emerald-600" />
            <h2 className="font-semibold text-slate-700">Sedang Berlangsung</h2>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <Card className="divide-y divide-slate-100 p-0">
            {active.map((item) => (
              <div key={item.examId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{item.title}</p>
                  <p className="text-xs text-slate-400">
                    <span className="font-medium text-indigo-600">{item.inProgress} siswa sedang mengerjakan</span>
                    {item.completed > 0 && ` · ${item.completed} selesai`}
                  </p>
                </div>
                <Link
                  to={`/app/ujian/${item.examId}/hasil`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                  <Eye className="h-3.5 w-3.5" /> Pantau
                </Link>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Ujian Terbaru</h2>
          <Link to="/app/ujian" className="text-sm font-medium text-indigo-600 hover:underline">
            Lihat semua
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-slate-400">
              Belum ada ujian.{' '}
              <Link to="/app/ujian" className="text-indigo-600 hover:underline">
                Buat ujian pertama
              </Link>
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-slate-100 p-0">
            {recent.map((exam) => (
              <Link
                key={exam.id}
                to="/app/ujian"
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{exam.title}</p>
                  <p className="text-xs text-slate-400">
                    {exam.classNames} · {exam.durationMinutes} menit · {formatDateTime(exam.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={exam.isPublished ? 'green' : 'yellow'}>
                    {exam.isPublished ? 'Terpublikasi' : 'Draf'}
                  </Badge>
                  <Eye className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
