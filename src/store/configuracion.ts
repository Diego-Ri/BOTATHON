import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ALMACENAMIENTO, CONFIGURACION_INICIAL } from '@/domain/constants';
import type { Configuracion } from '@/domain/types';

interface ConfiguracionState {
  configuracion: Configuracion;
  actualizar: (parcial: Partial<Configuracion>) => void;
  restablecer: () => void;
}

/**
 * Parámetros de gestión. Hoy persisten en el navegador; al conectar el backend
 * pasarán a `GET/PUT /api/configuracion` con auditoría por usuario.
 */
export const useConfiguracionStore = create<ConfiguracionState>()(
  persist(
    (set) => ({
      configuracion: CONFIGURACION_INICIAL,
      actualizar: (parcial) =>
        set((estado) => ({
          configuracion: { ...estado.configuracion, ...parcial },
        })),
      restablecer: () => set({ configuracion: CONFIGURACION_INICIAL }),
    }),
    {
      name: ALMACENAMIENTO.configuracion,
      version: 1,
    },
  ),
);

export function useConfiguracion(): Configuracion {
  return useConfiguracionStore((estado) => estado.configuracion);
}
