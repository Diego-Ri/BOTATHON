import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CampoBase {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  bloqueado?: boolean;
  contenedorClassName?: string;
}

const CLASES_CONTROL =
  'h-10 w-full rounded-lg border border-line bg-white text-sm text-ink shadow-sm transition-colors placeholder:text-muted/70 hover:border-line-strong focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-soft disabled:text-muted';

function Etiqueta({
  htmlFor,
  children,
  bloqueado,
}: {
  htmlFor: string;
  children: ReactNode;
  bloqueado?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1.5 text-xs font-semibold text-ink"
    >
      {children}
      {bloqueado ? (
        <Lock
          className="size-3 text-muted"
          aria-label="Filtro limitado por tu rol"
        />
      ) : null}
    </label>
  );
}

interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    CampoBase {
  children: ReactNode;
}

export function Select({
  etiqueta,
  ayuda,
  error,
  bloqueado,
  contenedorClassName,
  className,
  id,
  children,
  ...props
}: SelectProps) {
  const generado = useId();
  const controlId = id ?? generado;
  const descripcionId = `${controlId}-descripcion`;

  return (
    <div className={cn('min-w-0', contenedorClassName)}>
      <Etiqueta htmlFor={controlId} bloqueado={bloqueado}>
        {etiqueta}
      </Etiqueta>
      <div className="relative mt-1.5">
        <select
          id={controlId}
          className={cn(
            CLASES_CONTROL,
            'appearance-none py-0 pl-3 pr-9',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className,
          )}
          aria-describedby={ayuda || error ? descripcionId : undefined}
          aria-invalid={error ? true : undefined}
          disabled={bloqueado || props.disabled}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>
      {ayuda && !error ? (
        <p id={descripcionId} className="mt-1 text-[11px] leading-snug text-muted">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={descripcionId} className="mt-1 text-[11px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, CampoBase {
  sufijo?: string;
}

export function Input({
  etiqueta,
  ayuda,
  error,
  bloqueado,
  contenedorClassName,
  className,
  id,
  sufijo,
  ...props
}: InputProps) {
  const generado = useId();
  const controlId = id ?? generado;
  const descripcionId = `${controlId}-descripcion`;

  return (
    <div className={cn('min-w-0', contenedorClassName)}>
      <Etiqueta htmlFor={controlId} bloqueado={bloqueado}>
        {etiqueta}
      </Etiqueta>
      <div className="relative mt-1.5">
        <input
          id={controlId}
          className={cn(
            CLASES_CONTROL,
            'px-3',
            sufijo && 'pr-12',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className,
          )}
          aria-describedby={ayuda || error ? descripcionId : undefined}
          aria-invalid={error ? true : undefined}
          disabled={bloqueado || props.disabled}
          {...props}
        />
        {sufijo ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">
            {sufijo}
          </span>
        ) : null}
      </div>
      {ayuda && !error ? (
        <p id={descripcionId} className="mt-1 text-[11px] leading-snug text-muted">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={descripcionId} className="mt-1 text-[11px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  descripcion?: string;
}

export function Checkbox({
  etiqueta,
  descripcion,
  className,
  id,
  ...props
}: CheckboxProps) {
  const generado = useId();
  const controlId = id ?? generado;

  return (
    <label
      htmlFor={controlId}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 transition-colors hover:bg-soft',
        className,
      )}
    >
      <input
        id={controlId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-brand-700"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-ink">{etiqueta}</span>
        {descripcion ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {descripcion}
          </span>
        ) : null}
      </span>
    </label>
  );
}
