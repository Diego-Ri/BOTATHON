import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUsuarioActual } from '@/store/auth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const usuario = useUsuarioActual();
  const location = useLocation();

  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ destino: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}
