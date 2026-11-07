import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { APP_NAME } from '@/config/app';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Error no controlado en ${APP_NAME}`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-dvh place-items-center bg-canvas px-6">
          <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
              <AlertTriangle className="size-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-lg font-semibold text-ink">
              Ocurrió un error inesperado
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              El panel no pudo renderizar esta vista. Recarga la página para
              volver a intentarlo.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Recargar
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
