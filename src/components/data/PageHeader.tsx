import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  eyebrow?: string;
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  titulo,
  descripcion,
  acciones,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-xl font-semibold text-ink sm:text-2xl">
          {titulo}
        </h1>
        {descripcion ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            {descripcion}
          </p>
        ) : null}
      </div>
      {acciones ? (
        <div className="flex flex-wrap items-center gap-2">{acciones}</div>
      ) : null}
    </header>
  );
}
