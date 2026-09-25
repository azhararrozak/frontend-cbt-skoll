import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { GraduationCap, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Button, ErrorNote, Field, Input } from '../components/ui';
import { errorMessage } from '../lib/format';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn(email.trim(), password);
      navigate(user.role === 'siswa' ? '/siswa' : '/app', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="flex min-h-svh bg-slate-50">
      {/* Panel brand (desktop) */}
      <div className="hidden flex-1 flex-col justify-between bg-indigo-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold">CBT Skoll</span>
        </div>
        <div>
          <h1 className="text-3xl leading-snug font-bold">
            Ujian berbasis komputer,
            <br />
            sederhana &amp; andal.
          </h1>
          <p className="mt-3 max-w-md text-indigo-200">
            Kelola bank soal, buat ujian dengan token, dan pantau hasil siswa — semuanya dalam satu
            aplikasi ringan.
          </p>
        </div>
        <p className="text-sm text-indigo-300">© {new Date().getFullYear()} CBT Skoll</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white lg:mx-0">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Masuk ke akun Anda</h2>
            <p className="mt-1 text-sm text-slate-500">
              Belum punya akun?{' '}
              <Link to="/daftar" className="font-medium text-indigo-600 hover:underline">
                Daftar siswa
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorNote>{error}</ErrorNote>
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="nama@sekolah.sch.id"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              Masuk
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Akun demo (klik untuk isi otomatis):</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Admin', email: 'admin@cbt.test' },
                { label: 'Guru', email: 'guru@cbt.test' },
                { label: 'Siswa', email: 'siswa1@cbt.test' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email)}
                  className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Password semua akun: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
