import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

type TonoKpi = 'brand' | 'info' | 'success' | 'warning' | 'danger';

const TONOS: Record<TonoKpi, { icono: string; borde: string }> = {
  brand: { icono: 'bg-brand-50 text-brand-700', borde: 'border-l-brand-600' },
  info: { icono: 'bg-info-soft text-info', borde: 'border-l-info' },
  success: { icono: 'bg-success-soft text-success-strong', borde: 'border-l-success' },
  warning: { icono: 'bg-warning-soft text-warning-strong', borde: 'border-l-warning' },
  danger: { icono: 'bg-danger-soft text-danger-strong', borde: 'border-l-danger' },
};

interface KpiCardProps {
  etiqueta: string;
  valor: string;
  descripcion?: string;
  icono: ReactNode;
  tono?: TonoKpi;
  meta?: string;
  estado?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function KpiCard({
  etiqueta,
  valor,
  descripcion,
  icono,
  tono = 'brand',
  meta,
  estado,
  children,
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        'border-l-4 p-5',
        TONOS[tono].borde,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid size-9 place-items-center rounded-lg',
            TONOS[tono].icono,
          )}
          aria-hidden="true"
        >
          {icono}
        </span>
        {estado}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {etiqueta}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular">
        {valor}
      </p>
      {descripcion ? (
        <p className="mt-1 text-xs leading-relaxed text-muted">{descripcion}</p>
      ) : null}
      {meta ? (
        <p className="mt-2 inline-flex rounded-md bg-soft px-2 py-1 text-[11px] font-semibold text-muted ring-1 ring-inset ring-line">
          {meta}
        </p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  );
}
