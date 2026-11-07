import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TonoBadge =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

const TONOS: Record<TonoBadge, string> = {
  neutral: 'bg-soft text-muted ring-line',
  brand: 'bg-brand-50 text-brand-800 ring-brand-100',
  success: 'bg-success-soft text-success-strong ring-success/20',
  warning: 'bg-warning-soft text-warning-strong ring-warning/25',
  danger: 'bg-danger-soft text-danger-strong ring-danger/20',
  info: 'bg-info-soft text-info ring-info/20',
  outline: 'bg-transparent text-ink ring-line-strong',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tono?: TonoBadge;
  icono?: ReactNode;
}

export function Badge({
  tono = 'neutral',
  icono,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        TONOS[tono],
        className,
      )}
      {...props}
    >
      {icono}
      {children}
    </span>
  );
}
