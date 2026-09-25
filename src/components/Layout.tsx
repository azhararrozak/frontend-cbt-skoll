import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Avatar } from './Avatar';

/* ================= Admin & Guru ================= */

const menuItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/bank-soal', label: 'Bank Soal', icon: BookOpen },
  { to: '/app/kelas', label: 'Kelas', icon: School },
  { to: '/app/ujian', label: 'Ujian', icon: ClipboardList },
  { to: '/app/pengguna', label: 'Pengguna', icon: Users, adminOnly: true },
];

function SidebarContent({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <School className="h-5 w-5" />
        </div>
        <div>
          <p className="leading-tight font-bold text-slate-800">CBT Skoll</p>
          <p className="text-xs text-slate-400">Panel Pengelola</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {menuItems
          .filter((item) => !item.adminOnly || role === 'admin')
          .map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4.5 w-4.5" />
          Keluar
        </button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-svh bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="fixed inset-y-0 w-64">
          <SidebarContent role={user?.role ?? ''} />
        </div>
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onMouseDown={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <SidebarContent role={user?.role ?? ''} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setOpen((v) => !v)}
            className="cursor-pointer rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <p className="font-bold text-slate-800">CBT Skoll</p>
          <Avatar user={user} />
        </header>

        {/* User desktop */}
        <header className="hidden items-center justify-end gap-3 border-b border-slate-200 bg-white px-6 py-3 lg:flex">
          <Avatar user={user} />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ================= Siswa ================= */

export function StudentLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <School className="h-5 w-5" />
            </div>
            <div>
              <p className="leading-tight font-bold text-slate-800">CBT Skoll</p>
              <p className="text-xs text-slate-400">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
