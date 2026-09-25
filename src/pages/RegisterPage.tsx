import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, tokenStore } from '../lib/api';
import { Button, ErrorNote, Field, Input } from '../components/ui';
import { errorMessage } from '../lib/format';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Konfirmasi password tidak sama');
      return;
    }
    setLoading(true);
    try {
      const res = await api.signUp({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      const { user, accessToken, refreshToken } = res.data!;
      tokenStore.set({ accessToken, refreshToken, user });
      navigate('/siswa', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Daftar Akun Siswa</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorNote>{error}</ErrorNote>
          <Field label="Nama lengkap">
            <Input required minLength={2} placeholder="Nama Anda" value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Email">
            <Input type="email" required placeholder="nama@email.com" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Password" hint="Minimal 8 karakter">
            <Input type="password" required minLength={8} placeholder="••••••••" value={form.password} onChange={set('password')} />
          </Field>
          <Field label="Ulangi password">
            <Input type="password" required placeholder="••••••••" value={form.confirm} onChange={set('confirm')} />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Daftar
          </Button>
        </form>
      </div>
    </div>
  );
}
