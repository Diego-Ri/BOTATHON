import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/ui/Feedback';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { APP_NAME } from '@/config/app';

export function AppShell() {
  const [menuMovil, setMenuMovil] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuMovil(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuMovil) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const alPresionar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuMovil(false);
    };
    document.addEventListener('keydown', alPresionar);

    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', alPresionar);
    };
  }, [menuMovil]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-800 focus:shadow-float"
      >
        Saltar al contenido
      </a>

      <aside className="no-print sticky top-0 hidden h-dvh lg:block">
        <Sidebar />
      </aside>

      {menuMovil ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button
            type="button"
            className="absolute inset-0 bg-navy/55 backdrop-blur-[2px]"
            onClick={() => setMenuMovil(false)}
            aria-label="Cerrar menú"
          />
          <aside className="animate-aparecer absolute inset-y-0 left-0 w-72 max-w-[86vw] shadow-float">
            <Sidebar
              onCerrar={() => setMenuMovil(false)}
              onNavegar={() => setMenuMovil(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-dvh min-w-0 flex-col">
        <Topbar onAbrirMenu={() => setMenuMovil(true)} />
        <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px] space-y-6">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <footer className="no-print border-t border-line px-4 py-4 sm:px-6 lg:px-8">
          <p className="mx-auto max-w-[1440px] text-[11px] text-muted">
            {APP_NAME} · Frontend demo con datos deterministas. Preparado para
            conectar catálogo, metas y parámetros vía API.
          </p>
        </footer>
      </div>
    </div>
  );
}
