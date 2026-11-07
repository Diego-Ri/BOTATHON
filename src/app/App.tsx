import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FiltersProvider } from '@/components/filters/FiltersProvider';
import LoginPage from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequireVista } from '@/features/auth/RequireVista';
import { ErrorBoundary } from './ErrorBoundary';
import NotFoundPage from './NotFoundPage';

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const MiMetaPage = lazy(() => import('@/features/metas/MiMetaPage'));
const KpisPage = lazy(() => import('@/features/kpis/KpisPage'));
const ConsolidadoPage = lazy(() => import('@/features/consolidado/ConsolidadoPage'));
const PlanificadoPage = lazy(() => import('@/features/planificado/PlanificadoPage'));
const ReportesPage = lazy(() => import('@/features/reportes/ReportesPage'));
const ConfiguracionPage = lazy(() => import('@/features/configuracion/ConfiguracionPage'));

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <FiltersProvider>
                <AppShell />
              </FiltersProvider>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="mi-meta" element={<MiMetaPage />} />
          <Route path="kpis" element={<KpisPage />} />
          <Route
            path="consolidado"
            element={
              <RequireVista vista="consolidado">
                <ConsolidadoPage />
              </RequireVista>
            }
          />
          <Route path="planificado" element={<PlanificadoPage />} />
          <Route
            path="reportes"
            element={
              <RequireVista vista="reportes">
                <ReportesPage />
              </RequireVista>
            }
          />
          <Route
            path="configuracion"
            element={
              <RequireVista vista="configuracion">
                <ConfiguracionPage />
              </RequireVista>
            }
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
