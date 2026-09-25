import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { PageLoading } from './ui';
import type { UserRole } from '../types';

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Dipakai sebagai layout route (Outlet) maupun wrapper dengan children */
export function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children?: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'siswa' ? '/siswa' : '/app'} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}
