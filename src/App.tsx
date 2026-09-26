import { Navigate, Outlet, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { RequireAuth, RequireRole } from './components/Guard';
import { AppLayout, StudentLayout } from './components/Layout';
import { PageLoading } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { BanksPage } from './pages/admin/BanksPage';
import { BankDetailPage } from './pages/admin/BankDetailPage';
import { ClassesPage } from './pages/admin/ClassesPage';
import { ExamsPage } from './pages/admin/ExamsPage';
import { ExamResultsPage } from './pages/admin/ExamResultsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { BackupPage } from './pages/admin/BackupPage';
import { EventsPage } from './pages/admin/EventsPage';
import { EventDetailPage } from './pages/admin/EventDetailPage';
import { StudentDashboard } from './pages/siswa/StudentDashboard';
import { ExamPage } from './pages/siswa/ExamPage';
import { StudentResultPage } from './pages/siswa/StudentResultPage';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'siswa' ? '/siswa' : '/app'} replace />;
}

function GuestOnly() {
  const { user } = useAuth();
  if (!user) return <Outlet />;
  return <Navigate to={user.role === 'siswa' ? '/siswa' : '/app'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          {/* Area admin & guru */}
          <Route element={<RequireRole roles={['admin', 'guru']} />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/bank-soal" element={<BanksPage />} />
              <Route path="/app/bank-soal/:id" element={<BankDetailPage />} />
              <Route path="/app/kelas" element={<ClassesPage />} />
              <Route path="/app/ujian" element={<ExamsPage />} />
              <Route path="/app/event" element={<EventsPage />} />
              <Route path="/app/event/:id" element={<EventDetailPage />} />
              <Route path="/app/ujian/:id/hasil" element={<ExamResultsPage />} />
              <Route
                path="/app/pengguna"
                element={
                  <RequireRole roles={['admin']}>
                    <UsersPage />
                  </RequireRole>
                }
              />
              <Route
                path="/app/backup"
                element={
                  <RequireRole roles={['admin']}>
                    <BackupPage />
                  </RequireRole>
                }
              />
            </Route>
          </Route>

          {/* Area siswa */}
          <Route element={<RequireRole roles={['siswa']} />}>
            <Route element={<StudentLayout />}>
              <Route path="/siswa" element={<StudentDashboard />} />
              <Route path="/siswa/hasil/:sessionId" element={<StudentResultPage />} />
            </Route>
            {/* Halaman ujian: mode fokus, tanpa navigasi */}
            <Route path="/siswa/ujian/:sessionId" element={<ExamPage />} />
          </Route>
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
