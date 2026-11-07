import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { ETIQUETAS_ROL } from '@/domain/constants';
import { puedeVerVista, type VistaId } from '@/domain/permissions';
import { useUsuarioActual } from '@/store/auth';
import { clasesBoton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NAVEGACION } from '@/components/layout/nav';

export function RequireVista({
  vista,
  children,
}: {
  vista: VistaId;
  children: ReactNode;
}) {
  const usuario = useUsuarioActual();

  if (!puedeVerVista(usuario?.rol, vista)) {
    const nombreVista =
      NAVEGACION.find((item) => item.id === vista)?.nombre ?? 'esta vista';

    return (
      <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger ring-1 ring-danger/15">
          <ShieldX className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-lg font-semibold text-ink">Sin acceso a la vista</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {nombreVista} no está habilitada para el rol{' '}
          <strong className="font-semibold text-ink">
            {usuario ? ETIQUETAS_ROL[usuario.rol] : 'sin sesión'}
          </strong>
          . Si necesitas acceso, solicítalo a la dirección nacional.
        </p>
        <Link to="/" className={clasesBoton('outline', 'md', 'mt-5')}>
          Volver al inicio
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}
