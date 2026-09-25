import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Card, ErrorNote, PageHeader, PageLoading } from '../../components/ui';
import { errorMessage, formatDateTime } from '../../lib/format';
import type { ExamResults } from '../../types';

export function ExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ExamResults | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api
      .examResults(Number(id))
      .then((res) => active && setData(res.data!))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [id]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <PageLoading />;

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

      <PageHeader
        title={`Hasil — ${data.exam.title}`}
        subtitle={`${data.totalQuestions} soal · total ${data.totalPoints} poin · ${data.rows.length} peserta`}
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
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
        <Card>
          <p className="text-sm text-slate-500">Sedang dikerjakan</p>
          <p className="text-2xl font-bold text-slate-800">
            {data.rows.filter((r) => r.status === 'in_progress').length}
          </p>
        </Card>
      </div>

      {data.rows.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-slate-400">
            Belum ada siswa yang memulai ujian ini.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Siswa</th>
                <th className="px-4 py-3 font-medium">Nilai</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Selesai pada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row, i) => (
                <tr key={row.sessionId} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700">{row.studentName}</p>
                    <p className="text-xs text-slate-400">{row.studentEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 font-bold ${row.score >= data.totalPoints / 2 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {row.status === 'completed' && row.score === data.totalPoints && data.totalPoints > 0 && (
                        <Trophy className="h-4 w-4 text-amber-500" />
                      )}
                      {row.score}
                      <span className="text-xs font-normal text-slate-400">/{data.totalPoints}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 'completed' ? 'green' : 'yellow'}>
                      {row.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(row.finishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
