import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

type AnchoModal = 'sm' | 'md' | 'lg' | 'xl';

const ANCHOS: Record<AnchoModal, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: AnchoModal;
}

export function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = 'md',
}: ModalProps) {
  const tituloId = useId();
  const descripcionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const enfocar = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      (focusables[0] ?? panel).focus();
    };

    const alPresionar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCerrar();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((elemento) => elemento.offsetParent !== null);
      if (focusables.length === 0) return;

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero?.focus();
      } else if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo?.focus();
      }
    };

    const frame = window.requestAnimationFrame(enfocar);
    document.addEventListener('keydown', alPresionar);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus();
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcion ? descripcionId : undefined}
        tabIndex={-1}
        className={cn(
          'animate-aparecer flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-float sm:rounded-2xl',
          ANCHOS[ancho],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={tituloId} className="text-base font-semibold text-ink">
              {titulo}
            </h2>
            {descripcion ? (
              <p
                id={descripcionId}
                className="mt-1 text-xs leading-relaxed text-muted"
              >
                {descripcion}
              </p>
            ) : null}
          </div>
          <IconButton etiqueta="Cerrar" onClick={onCerrar} className="-mr-1 -mt-1">
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="scrollbar-sutil overflow-y-auto px-5 py-4">{children}</div>
        {pie ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-soft px-5 py-3">
            {pie}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
