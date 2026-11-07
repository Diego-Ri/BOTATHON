import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type TonoProgreso = 'brand' | 'success' | 'warning' | 'danger';

const RELLENO: Record<TonoProgreso, string> = {
  brand: 'bg-brand-600',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

function limitar(valor: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(valor) ? valor : 0));
}

interface ProgressBarProps {
  valor: number;
  meta?: number;
  tono?: TonoProgreso;
  etiqueta?: string;
  className?: string;
}

export function ProgressBar({
  valor,
  meta,
  tono = 'brand',
  etiqueta,
  className,
}: ProgressBarProps) {
  const porcentaje = limitar(valor);
  const objetivo = meta === undefined ? undefined : limitar(meta);

  return (
    <div className={cn('w-full', className)}>
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-line/80"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(porcentaje)}
        aria-label={etiqueta ?? 'Avance'}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', RELLENO[tono])}
          style={{ width: `${porcentaje}%` }}
        />
        {objetivo !== undefined ? (
          <span
            className="absolute top-0 h-full w-0.5 bg-navy/50"
            style={{ left: `calc(${objetivo}% - 1px)` }}
            title={`Meta: ${objetivo}%`}
          />
        ) : null}
      </div>
    </div>
  );
}

interface ProgressRingProps {
  valor: number;
  size?: number;
  grosor?: number;
  tono?: TonoProgreso;
  children?: ReactNode;
  etiqueta?: string;
}

const COLOR_ANILLO: Record<TonoProgreso, string> = {
  brand: 'var(--color-brand-600)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
};

export function ProgressRing({
  valor,
  size = 168,
  grosor = 12,
  tono = 'brand',
  children,
  etiqueta,
}: ProgressRingProps) {
  const porcentaje = limitar(valor);

  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        padding: grosor,
        background: `conic-gradient(${COLOR_ANILLO[tono]} ${porcentaje * 3.6}deg, var(--color-line) 0deg)`,
      }}
      role="img"
      aria-label={etiqueta ?? `Avance ${Math.round(porcentaje)}%`}
    >
      <div className="grid size-full place-items-center rounded-full bg-surface shadow-inner">
        {children}
      </div>
    </div>
  );
}
