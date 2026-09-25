import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, tokenStore } from '../lib/api';
import { AuthContext } from './context';
import type { User } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => tokenStore.getUser());
  // true hanya jika ada sesi tersimpan; akan diselesaikan oleh validasi async di bawah
  const [loading, setLoading] = useState<boolean>(() => Boolean(tokenStore.getAccess()));

  // Validasi sesi tersimpan saat aplikasi pertama dibuka
  useEffect(() => {
    if (!tokenStore.getAccess()) return;
    let active = true;
    api
      .me()
      .then((res) => {
        if (active) setUser(res.data!);
      })
      .catch(() => {
        tokenStore.clear();
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.signIn({ email, password });
    const { user: u, accessToken, refreshToken } = res.data!;
    tokenStore.set({ accessToken, refreshToken, user: u });
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(() => {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      api.signOut(refreshToken).catch(() => {});
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
