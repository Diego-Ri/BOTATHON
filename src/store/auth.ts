import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALMACENAMIENTO } from '@/domain/constants';
import { USUARIO_POR_ID } from '@/data/seed';
import type { Usuario } from '@/domain/types';

interface AuthState {
  usuarioId: string | null;
  iniciarSesion: (usuarioId: string) => void;
  cerrarSesion: () => void;
}

/**
 * Sesión demo. En producción se reemplaza por OIDC/SSO manteniendo el mismo
 * hook `useUsuarioActual`; el usuario y su alcance deben venir del servidor.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuarioId: null,
      iniciarSesion: (usuarioId) => set({ usuarioId }),
      cerrarSesion: () => set({ usuarioId: null }),
    }),
    { name: ALMACENAMIENTO.sesion },
  ),
);

export function useUsuarioActual(): Usuario | null {
  const usuarioId = useAuthStore((estado) => estado.usuarioId);
  return usuarioId ? (USUARIO_POR_ID.get(usuarioId) ?? null) : null;
}
