import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-line/70', className)}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ etiqueta = 'Cargando información…' }: { etiqueta?: string }) {
  return (
    <div
      className="grid min-h-[40dvh] place-items-center px-6 py-16"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-muted">
        <div className="size-8 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        <p className="text-sm">{etiqueta}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  titulo: string;
  descripcion: string;
  icono?: ReactNode;
  accion?: ReactNode;
  className?: string;
}

export function EmptyState({
  titulo,
  descripcion,
  icono,
  accion,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-xl bg-soft text-muted ring-1 ring-line">
        {icono ?? <Inbox className="size-5" aria-hidden="true" />}
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink">{titulo}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
        {descripcion}
      </p>
      {accion ? <div className="mt-4">{accion}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  mensaje?: string;
  onReintentar?: () => void;
}

export function ErrorState({
  mensaje = 'No pudimos cargar la información. Revisa tu conexión e inténtalo nuevamente.',
  onReintentar,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-danger-soft text-danger ring-1 ring-danger/20">
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink">Algo salió mal</h3>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">{mensaje}</p>
      {onReintentar ? (
        <Button
          variante="outline"
          tamano="sm"
          className="mt-4"
          icono={<RefreshCw className="size-3.5" aria-hidden="true" />}
          onClick={onReintentar}
        >
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

interface InlineAlertProps {
  tono?: 'info' | 'success' | 'warning' | 'danger';
  titulo: string;
  children?: ReactNode;
  icono?: ReactNode;
  className?: string;
}

const TONOS_ALERTA = {
  info: 'border-info/20 bg-info-soft text-info',
  success: 'border-success/20 bg-success-soft text-success-strong',
  warning: 'border-warning/25 bg-warning-soft text-warning-strong',
  danger: 'border-danger/20 bg-danger-soft text-danger-strong',
} as const;

export function InlineAlert({
  tono = 'info',
  titulo,
  children,
  icono,
  className,
}: InlineAlertProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        TONOS_ALERTA[tono],
        className,
      )}
      role={tono === 'danger' || tono === 'warning' ? 'alert' : 'status'}
    >
      <span className="mt-0.5 shrink-0">
        {icono ?? <AlertCircle className="size-4" aria-hidden="true" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{titulo}</p>
        {children ? (
          <div className="mt-0.5 text-xs leading-relaxed opacity-90">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
