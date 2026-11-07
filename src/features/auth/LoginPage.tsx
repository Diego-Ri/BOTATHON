import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  FileDown,
  HeartPulse,
  Layers3,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ETIQUETAS_ROL } from '@/domain/constants';
import type { Rol } from '@/domain/types';
import { USUARIOS_DEMO } from '@/data/seed';
import { useAuthStore, useUsuarioActual } from '@/store/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type TonoBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { APP_NAME } from '@/config/app';

const TONO_ROL: Record<Rol, TonoBadge> = {
  profesional: 'brand',
  jefatura_area: 'info',
  direccion_instituto: 'success',
  direccion_nacional: 'neutral',
};

const BENEFICIOS = [
  {
    icono: Layers3,
    titulo: 'Nacional → instituto → área → profesional',
    detalle: 'Drill-down en tres clics, con el estado siempre en la URL.',
  },
  {
    icono: ChartNoAxesCombined,
    titulo: 'Indicadores que cuadran',
    detalle: 'Meta de gestión, FOJA y desviación calculadas sobre los mismos totales.',
  },
  {
    icono: FileDown,
    titulo: 'Exportación con contexto',
    detalle: 'PDF y Excel respetan filtros, alcance y parámetros vigentes.',
  },
];

export default function LoginPage() {
  const usuarioActual = useUsuarioActual();
  const iniciarSesion = useAuthStore((estado) => estado.iniciarSesion);
  const navigate = useNavigate();
  const location = useLocation();

  if (usuarioActual) return <Navigate to="/" replace />;

  const destinoEstado = (location.state as { destino?: string } | null)?.destino;
  const destino =
    destinoEstado && destinoEstado.startsWith('/') ? destinoEstado : '/';

  const entrar = (id: string) => {
    iniciarSesion(id);
    navigate(destino, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[0.88fr_1.12fr]">
      <section className="relative hidden overflow-hidden bg-navy p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="pointer-events-none absolute -right-28 -top-24 size-80 rounded-full bg-brand-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-info/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand-400/20 text-brand-200 ring-1 ring-inset ring-brand-300/30">
              <HeartPulse className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight">{APP_NAME}</p>
              <p className="text-[11px] font-medium text-white/55">
                Panel de metas asistenciales
              </p>
            </div>
          </div>

          <h1 className="mt-14 max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            La gestión clínica, desde la meta individual hasta la vista nacional.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">
            Un solo lugar para revisar atenciones objetivo, horas directas,
            indirectas y NAS, cumplimiento FOJA y desviación planificado vs SIC.
          </p>

          <ul className="mt-10 space-y-5">
            {BENEFICIOS.map((beneficio) => {
              const Icono = beneficio.icono;
              return (
                <li key={beneficio.titulo} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-200 ring-1 ring-inset ring-white/10">
                    <Icono className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{beneficio.titulo}</p>
                    <p className="mt-0.5 max-w-sm text-xs leading-relaxed text-white/55">
                      {beneficio.detalle}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative mt-12 flex items-center gap-2 text-[11px] text-white/45">
          <ShieldCheck className="size-4 text-brand-300" aria-hidden="true" />
          Demo funcional · datos ficticios · corte octubre 2026
        </div>
      </section>

      <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-navy text-brand-200">
              <HeartPulse className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold text-ink">{APP_NAME}</p>
              <p className="text-[11px] text-muted">Panel de metas asistenciales</p>
            </div>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
            Acceso demo
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">
            Elige un perfil para entrar
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Incluimos <strong className="font-semibold text-ink">4 roles</strong> y{' '}
            <strong className="font-semibold text-ink">5 usuarios</strong> para
            recorrer todos los alcances: una persona, un área, un instituto y la
            vista nacional.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {USUARIOS_DEMO.map((usuario, indice) => (
              <button
                key={usuario.id}
                type="button"
                onClick={() => entrar(usuario.id)}
                className={cn(
                  'group card-base flex flex-col p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-float',
                  indice === 0 && 'sm:col-span-1',
                )}
                aria-label={`Ingresar como ${usuario.nombre}, ${ETIQUETAS_ROL[usuario.rol]}`}
              >
                <div className="flex w-full items-start gap-3">
                  <Avatar
                    nombre={usuario.nombre}
                    iniciales={usuario.iniciales}
                    tamano="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {usuario.nombre}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {usuario.cargo}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3">
                  <Badge tono={TONO_ROL[usuario.rol]}>
                    {ETIQUETAS_ROL[usuario.rol]}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  {usuario.descripcion}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
                  <Check className="size-3" aria-hidden="true" />
                  Entrar con este perfil
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-line bg-white/60 px-4 py-3 text-[11px] leading-relaxed text-muted">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
            <p>
              Esta demo no solicita contraseña: la sesión se guarda solo en este
              navegador. El frontend deja el punto de integración listo para SSO
              y para que el backend revalide el alcance de cada rol.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
