import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { clasesBoton } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Compass className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
          Error 404
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          No encontramos esta página
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          La dirección puede haber cambiado o el enlace estar incompleto.
        </p>
        <Link to="/" className={clasesBoton('primary', 'md', 'mt-6')}>
          Volver al panel
        </Link>
      </div>
    </main>
  );
}
