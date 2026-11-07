import { cn } from '@/lib/cn';

const TAMANOS = {
  sm: 'size-8 text-[11px]',
  md: 'size-10 text-xs',
  lg: 'size-12 text-sm',
} as const;

const TONOS = [
  'bg-brand-50 text-brand-800 ring-brand-100',
  'bg-info-soft text-info ring-info/20',
  'bg-success-soft text-success-strong ring-success/20',
  'bg-warning-soft text-warning-strong ring-warning/20',
  'bg-danger-soft text-danger-strong ring-danger/20',
] as const;

interface AvatarProps {
  nombre: string;
  iniciales: string;
  tamano?: keyof typeof TAMANOS;
  claro?: boolean;
  className?: string;
}

export function Avatar({
  nombre,
  iniciales,
  tamano = 'md',
  claro = false,
  className,
}: AvatarProps) {
  const indice = [...nombre].reduce((suma, letra) => suma + letra.charCodeAt(0), 0);
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold ring-1 ring-inset',
        TAMANOS[tamano],
        claro
          ? 'bg-white/10 text-white ring-white/15'
          : TONOS[indice % TONOS.length],
        className,
      )}
      title={nombre}
      aria-hidden="true"
    >
      {iniciales}
    </span>
  );
}
