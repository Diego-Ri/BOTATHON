import {
  CircleAlert,
  CircleCheck,
  CircleMinus,
  TriangleAlert,
} from 'lucide-react';
import { SEMAFORO_CONFIG } from '@/domain/constants';
import type { Semaforo } from '@/domain/types';
import { cn } from '@/lib/cn';

const ESTILOS: Record<
  Semaforo,
  { clase: string; icono: typeof CircleCheck }
> = {
  ok: { clase: 'bg-success-soft text-success-strong ring-success/20', icono: CircleCheck },
  atencion: {
    clase: 'bg-warning-soft text-warning-strong ring-warning/25',
    icono: TriangleAlert,
  },
  alerta: { clase: 'bg-danger-soft text-danger-strong ring-danger/20', icono: CircleAlert },
  'sin-datos': { clase: 'bg-soft text-muted ring-line', icono: CircleMinus },
};

interface SemaforoBadgeProps {
  estado: Semaforo;
  compacto?: boolean;
  className?: string;
}

export function SemaforoBadge({ estado, compacto = false, className }: SemaforoBadgeProps) {
  const estilo = ESTILOS[estado];
  const Icono = estilo.icono;
  const config = SEMAFORO_CONFIG[estado];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        estilo.clase,
        className,
      )}
      title={config.descripcion}
    >
      <Icono className="size-3.5 shrink-0" aria-hidden="true" />
      {compacto ? (
        <span className="sr-only">{config.etiqueta}</span>
      ) : (
        config.etiqueta
      )}
    </span>
  );
}

export function SemaforoPunto({ estado, className }: { estado: Semaforo; className?: string }) {
  const colores: Record<Semaforo, string> = {
    ok: 'bg-success',
    atencion: 'bg-warning',
    alerta: 'bg-danger',
    'sin-datos': 'bg-muted',
  };
  return (
    <span
      className={cn('inline-block size-2 rounded-full', colores[estado], className)}
      role="img"
      aria-label={SEMAFORO_CONFIG[estado].etiqueta}
    />
  );
}
