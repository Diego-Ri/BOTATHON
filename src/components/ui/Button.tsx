import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type VarianteBoton =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline';
export type TamanoBoton = 'sm' | 'md' | 'lg';

const VARIANTES: Record<VarianteBoton, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 border border-transparent',
  secondary:
    'bg-brand-50 text-brand-800 border border-brand-100 hover:bg-brand-100 active:bg-brand-200',
  ghost:
    'bg-transparent text-ink border border-transparent hover:bg-soft active:bg-line/60',
  danger:
    'bg-danger text-white border border-transparent hover:bg-danger-strong active:bg-danger-strong',
  outline:
    'bg-white text-ink border border-line hover:border-line-strong hover:bg-soft active:bg-line/40',
};

const TAMANOS: Record<TamanoBoton, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs',
  md: 'h-10 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
};

export function clasesBoton(
  variante: VarianteBoton = 'primary',
  tamano: TamanoBoton = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANTES[variante],
    TAMANOS[tamano],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  cargando?: boolean;
  icono?: ReactNode;
}

export function Button({
  variante = 'primary',
  tamano = 'md',
  cargando = false,
  icono,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clasesBoton(variante, tamano, className)}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {cargando ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        icono
      )}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  etiqueta: string;
  variante?: VarianteBoton;
}

export function IconButton({
  etiqueta,
  variante = 'ghost',
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={etiqueta}
      title={etiqueta}
      className={clasesBoton(variante, 'sm', cn('size-9 px-0', className))}
      {...props}
    >
      {children}
    </button>
  );
}
