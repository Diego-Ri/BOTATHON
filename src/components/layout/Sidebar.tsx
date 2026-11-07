import { Activity, HeartPulse, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ETIQUETAS_ROL } from '@/domain/constants';
import { puedeVerVista } from '@/domain/permissions';
import type { Rol } from '@/domain/types';
import { useUsuarioActual } from '@/store/auth';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/Button';
import { NAVEGACION, nombreNavegacion } from './nav';
import { APP_NAME } from '@/config/app';

interface SidebarProps {
  onNavegar?: () => void;
  onCerrar?: () => void;
}

export function Sidebar({ onNavegar, onCerrar }: SidebarProps) {
  const usuario = useUsuarioActual();
  const rol = usuario?.rol as Rol | undefined;
  const items = NAVEGACION.filter((item) => puedeVerVista(rol, item.id));
  const grupos = ['Panel', 'Análisis', 'Gestión'] as const;

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500/20 text-brand-200 ring-1 ring-inset ring-brand-400/30">
            <HeartPulse className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">{APP_NAME}</span>
            <span className="block text-[10px] font-medium text-white/55">
              Metas de gestión
            </span>
          </span>
        </div>
        {onCerrar ? (
          <IconButton
            etiqueta="Cerrar menú"
            onClick={onCerrar}
            className="text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>

      <nav className="scrollbar-sutil flex-1 overflow-y-auto px-3 pb-4" aria-label="Navegación principal">
        {grupos.map((grupo) => {
          const visibles = items.filter((item) => item.grupo === grupo);
          if (visibles.length === 0) return null;

          return (
            <div key={grupo} className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                {grupo}
              </p>
              <ul className="space-y-1">
                {visibles.map((item) => {
                  const Icono = item.icono;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.ruta}
                        end={item.ruta === '/'}
                        onClick={onNavegar}
                        className={({ isActive }) =>
                          cn(
                            'group flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                            isActive
                              ? 'bg-brand-500/15 text-white shadow-[inset_2px_0_0_var(--color-brand-300)]'
                              : 'text-white/65 hover:bg-white/5 hover:text-white',
                          )
                        }
                        title={item.descripcion}
                      >
                        <Icono
                          className="size-4 shrink-0 opacity-80"
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {nombreNavegacion(item, rol)}
                        </span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 text-[11px] text-white/55">
          <Activity className="size-3.5 text-brand-300" aria-hidden="true" />
          <span>Datos demo · corte oct 2026</span>
        </div>
        <p className="mt-1 text-[10px] text-white/35">
          {usuario ? ETIQUETAS_ROL[usuario.rol] : 'Frontend'} · v0.1
        </p>
      </div>
    </div>
  );
}
