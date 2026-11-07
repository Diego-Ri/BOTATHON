import { useEffect, useRef, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ETIQUETAS_ROL } from '@/domain/constants';
import { useUsuarioActual, useAuthStore } from '@/store/auth';
import { useFiltros } from '@/components/filters/FiltersProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { NAVEGACION, nombreNavegacion } from './nav';
import { etiquetaPeriodo } from '@/lib/format';

function tituloActual(pathname: string): string {
  const item = NAVEGACION.find((elemento) =>
    elemento.ruta === '/'
      ? pathname === '/'
      : pathname.startsWith(elemento.ruta),
  );
  return item?.nombre ?? 'Panel';
}

export function Topbar({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const usuario = useUsuarioActual();
  const { etiquetaAlcance, filtros } = useFiltros();
  const location = useLocation();
  const navigate = useNavigate();
  const cerrarSesion = useAuthStore((estado) => estado.cerrarSesion);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuAbierto) return;

    const alHacerClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    };
    const alPresionar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuAbierto(false);
    };

    document.addEventListener('mousedown', alHacerClick);
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('mousedown', alHacerClick);
      document.removeEventListener('keydown', alPresionar);
    };
  }, [menuAbierto]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  const salir = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  if (!usuario) return null;

  const item = NAVEGACION.find((elemento) =>
    elemento.ruta === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(elemento.ruta),
  );

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton
          etiqueta="Abrir menú"
          onClick={onAbrirMenu}
          className="lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </IconButton>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {item ? nombreNavegacion(item, usuario.rol) : tituloActual(location.pathname)}
          </p>
          <p className="hidden truncate text-[11px] text-muted sm:block">
            {item?.descripcion ?? 'Panel de metas'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          tono="neutral"
          className="hidden items-center gap-1.5 md:inline-flex"
          icono={<CalendarClock className="size-3" aria-hidden="true" />}
        >
          {etiquetaPeriodo(filtros.mes)}
        </Badge>
        <span className="hidden h-6 w-px bg-line md:block" aria-hidden="true" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            className="flex items-center gap-2 rounded-full p-1 pr-1.5 transition-colors hover:bg-soft sm:pr-2"
            aria-haspopup="menu"
            aria-expanded={menuAbierto}
            aria-label="Abrir menú de usuario"
          >
            <Avatar
              nombre={usuario.nombre}
              iniciales={usuario.iniciales}
              tamano="sm"
            />
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight text-ink">
                {usuario.nombre}
              </span>
              <span className="block text-[10px] leading-tight text-muted">
                {ETIQUETAS_ROL[usuario.rol]}
              </span>
            </span>
            <ChevronDown
              className={`hidden size-3.5 text-muted transition-transform sm:block ${
                menuAbierto ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {menuAbierto ? (
            <div
              role="menu"
              aria-label="Menú de usuario"
              className="animate-aparecer absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-float"
            >
              <div className="border-b border-line p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    nombre={usuario.nombre}
                    iniciales={usuario.iniciales}
                    tamano="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {usuario.nombre}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {usuario.email}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-brand-800">
                  {ETIQUETAS_ROL[usuario.rol]}
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-muted">
                  <ShieldCheck
                    className="mt-0.5 size-3 shrink-0 text-brand-600"
                    aria-hidden="true"
                  />
                  {etiquetaAlcance}
                </p>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={salir}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
