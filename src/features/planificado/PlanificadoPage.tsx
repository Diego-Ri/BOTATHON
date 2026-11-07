import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardList,
  Database,
  LockKeyhole,
  Settings2,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMetas, useSerieMensual } from '@/data/queries';
import {
  clasificarDesviacion,
  semaforoDeIndicadores,
} from '@/domain/calc';
import { puedeAjustarUmbral } from '@/domain/permissions';
import {
  alertasDeDesviacion,
  totalConsolidado,
} from '@/domain/selectors';
import type { Configuracion, Semaforo } from '@/domain/types';
import { useFiltros } from '@/components/filters/FiltersProvider';
import { FilterBar } from '@/components/filters/FilterBar';
import { ExportButton } from '@/components/export/ExportButton';
import { PageHeader } from '@/components/data/PageHeader';
import { KpiCard } from '@/components/data/KpiCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { SemaforoBadge } from '@/components/ui/Semaforo';
import { InlineAlert, EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { ComparativoChart } from '@/components/charts/ComparativoChart';
import { useConfiguracion, useConfiguracionStore } from '@/store/configuracion';
import { useUsuarioActual } from '@/store/auth';
import { construirReportePlanificado } from '@/lib/export/builders';
import { filtrosToQuery } from '@/lib/filters';
import {
  etiquetaPeriodo,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';

const TONO_SEMAFORO: Record<Semaforo, 'success' | 'warning' | 'danger' | 'info'> = {
  ok: 'success',
  atencion: 'warning',
  alerta: 'danger',
  'sin-datos': 'info',
};

function UmbralControl({ configuracion }: { configuracion: Configuracion }) {
  const usuario = useUsuarioActual();
  const actualizar = useConfiguracionStore((estado) => estado.actualizar);
  const [valor, setValor] = useState(String(configuracion.umbralDesviacion));
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const puedeAjustar = puedeAjustarUmbral(usuario?.rol);

  useEffect(() => {
    setValor(String(configuracion.umbralDesviacion));
  }, [configuracion.umbralDesviacion]);

  useEffect(() => {
    if (!guardado) return;
    const temporizador = window.setTimeout(() => setGuardado(false), 2500);
    return () => window.clearTimeout(temporizador);
  }, [guardado]);

  const aplicar = () => {
    const numero = Number(valor.replace(',', '.'));
    if (!Number.isFinite(numero) || numero < 1 || numero > 50) {
      setError('El umbral debe estar entre 1% y 50%.');
      return;
    }
    setError(null);
    actualizar({ umbralDesviacion: Math.round(numero * 10) / 10 });
    setGuardado(true);
  };

  return (
    <Card>
      <CardHeader
        titulo="Umbral de desviación"
        descripcion="Se aplica al semáforo, a las alertas y a las exportaciones."
        icono={<Settings2 className="size-4" aria-hidden="true" />}
        accion={<Badge tono="brand">±{formatearPct(configuracion.umbralDesviacion)}</Badge>}
      />
      <CardBody className="space-y-4">
        <div className="rounded-xl bg-soft p-4 text-center ring-1 ring-inset ring-line">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Umbral vigente
          </p>
          <p className="mt-1 text-3xl font-semibold text-ink tabular">
            ±{formatearPct(configuracion.umbralDesviacion)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Alerta si la desviación absoluta supera este valor.
          </p>
        </div>

        {puedeAjustar ? (
          <div>
            <Input
              etiqueta="Ajustar umbral"
              type="number"
              min={1}
              max={50}
              step={0.5}
              value={valor}
              onChange={(event) => {
                setValor(event.target.value);
                setError(null);
              }}
              sufijo="%"
              error={error ?? undefined}
              ayuda="Dirección nacional puede modificarlo entre 1% y 50%."
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[5, 10, 15, 20].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setValor(String(preset));
                    setError(null);
                  }}
                  className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-brand-300 hover:text-brand-800"
                >
                  {preset}%
                </button>
              ))}
              <Button
                variante="primary"
                tamano="sm"
                onClick={aplicar}
                className="ml-auto"
              >
                Aplicar
              </Button>
            </div>
            <p className="mt-1 min-h-4 text-[11px] font-medium text-success-strong" aria-live="polite">
              {guardado ? 'Umbral actualizado en toda la vista.' : ''}
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-soft px-3 py-2.5 text-[11px] leading-relaxed text-muted ring-1 ring-inset ring-line">
            <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>
              El umbral lo define la dirección nacional. Tu vista usa el valor
              vigente de ±{formatearPct(configuracion.umbralDesviacion)}.
            </p>
          </div>
        )}

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Cómo leer el semáforo
          </p>
          <ul className="space-y-2 text-[11px]">
            <li className="flex items-center justify-between gap-2">
              <SemaforoBadge estado="ok" />
              <span className="text-muted">
                ≤ {formatearPct(configuracion.umbralDesviacion * 0.5)}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <SemaforoBadge estado="atencion" />
              <span className="text-muted">
                &gt; {formatearPct(configuracion.umbralDesviacion * 0.5)} y ≤{' '}
                {formatearPct(configuracion.umbralDesviacion)}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <SemaforoBadge estado="alerta" />
              <span className="text-muted">
                &gt; {formatearPct(configuracion.umbralDesviacion)}
              </span>
            </li>
          </ul>
        </div>

        {puedeAjustar ? (
          <Link
            to="/configuracion"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
          >
            Ir a configuración
            <Settings2 className="size-3" aria-hidden="true" />
          </Link>
        ) : null}
      </CardBody>
    </Card>
  );
}

export default function PlanificadoPage() {
  const usuario = useUsuarioActual();
  const { filtros, catalogo, scope, etiquetaAlcance } = useFiltros();
  const configuracion = useConfiguracion();
  const metasQuery = useMetas(filtros, scope);
  const serieQuery = useSerieMensual(filtros, scope);

  if (!usuario) return null;

  const metas = metasQuery.data ?? [];
  const serie = serieQuery.data ?? [];
  const total = totalConsolidado(metas);
  const alertas = alertasDeDesviacion(metas, catalogo, configuracion);
  const semaforo = semaforoDeIndicadores(total, configuracion);
  const cargando = metasQuery.isPending || serieQuery.isPending;
  const error = metasQuery.isError || serieQuery.isError;
  const diferencia = total.sic - total.planificado;
  const mesesEnAlerta = serie.filter(
    (punto) =>
      clasificarDesviacion(
        punto.indicadores.desviacion,
        configuracion.umbralDesviacion,
        punto.indicadores.planificado > 0,
      ) === 'alerta',
  );
  const supera = semaforo === 'alerta';

  const construirReporte = () =>
    construirReportePlanificado({
      usuario,
      filtros,
      catalogo,
      configuracion,
      metas,
      serie,
    });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Planificado vs SIC"
        titulo="Desviación mensual"
        descripcion={`${etiquetaPeriodo(filtros.mes)} · ${etiquetaAlcance}. Compara lo planificado con el registro SIC y revisa el semáforo con el umbral vigente.`}
        acciones={
          !cargando && !error && metas.length > 0 ? (
            <ExportButton construir={construirReporte} />
          ) : undefined
        }
      />

      <FilterBar />

      {cargando ? <PageLoader etiqueta="Comparando planificado y SIC…" /> : null}

      {error ? (
        <Card>
          <ErrorState
            onReintentar={() => {
              void metasQuery.refetch();
              void serieQuery.refetch();
            }}
          />
        </Card>
      ) : null}

      {!cargando && !error && metas.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Sin registros para comparar"
            descripcion="No hay planificado ni SIC para los filtros seleccionados. Ajusta el alcance o el mes."
          />
        </Card>
      ) : null}

      {!cargando && !error && metas.length > 0 ? (
        <>
          {supera ? (
            <InlineAlert
              tono="danger"
              titulo={`La desviación del mes supera el umbral de ±${formatearPct(configuracion.umbralDesviacion)}`}
              icono={<TriangleAlert className="size-4" aria-hidden="true" />}
            >
              El alcance presenta una desviación de{' '}
              <strong>{formatearPctConSigno(total.desviacion)}</strong> y{' '}
              {alertas.length}{' '}
              {alertas.length === 1 ? 'profesional supera' : 'profesionales superan'}{' '}
              el umbral. Revisa el detalle antes de exportar el reporte.
            </InlineAlert>
          ) : alertas.length > 0 ? (
            <InlineAlert
              tono="warning"
              titulo={`${alertas.length} ${alertas.length === 1 ? 'profesional supera' : 'profesionales superan'} el umbral`}
              icono={<TriangleAlert className="size-4" aria-hidden="true" />}
            >
              El consolidado del alcance está en {formatearPctConSigno(total.desviacion)},
              pero hay fichas individuales sobre ±
              {formatearPct(configuracion.umbralDesviacion)}. Revisa el detalle
              antes de exportar el reporte.
            </InlineAlert>
          ) : (
            <InlineAlert
              tono="success"
              titulo="Desviación dentro del umbral"
              icono={<CheckCircle2 className="size-4" aria-hidden="true" />}
            >
              La desviación del alcance es {formatearPctConSigno(total.desviacion)} y
              no supera el umbral de ±{formatearPct(configuracion.umbralDesviacion)}.
              {mesesEnAlerta.length > 0
                ? ` Hay ${mesesEnAlerta.length} ${mesesEnAlerta.length === 1 ? 'mes' : 'meses'} de la serie fuera de umbral.`
                : ''}
            </InlineAlert>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              etiqueta="Planificado"
              valor={formatearNumero(total.planificado)}
              descripcion="Atenciones comprometidas en el plan mensual."
              icono={<ClipboardList className="size-4" aria-hidden="true" />}
              tono="brand"
              meta={etiquetaPeriodo(filtros.mes)}
            />
            <KpiCard
              etiqueta="SIC"
              valor={formatearNumero(total.sic)}
              descripcion="Actividad efectivamente registrada en SIC."
              icono={<Database className="size-4" aria-hidden="true" />}
              tono="info"
              meta={`${formatearNumero(total.profesionales)} profesionales`}
            />
            <KpiCard
              etiqueta="Diferencia SIC − Planificado"
              valor={formatearNumero(diferencia)}
              descripcion="Diferencia absoluta de atenciones del período."
              icono={<ArrowLeftRight className="size-4" aria-hidden="true" />}
              tono={diferencia === 0 ? 'success' : 'warning'}
              meta={`${formatearPctConSigno(total.desviacion)} de desviación`}
            />
            <KpiCard
              etiqueta="Desviación"
              valor={formatearPctConSigno(total.desviacion)}
              descripcion="SIC sobre planificado, con semáforo por umbral."
              icono={<TriangleAlert className="size-4" aria-hidden="true" />}
              tono={TONO_SEMAFORO[semaforo]}
              meta={`Umbral ±${formatearPct(configuracion.umbralDesviacion)}`}
              estado={<SemaforoBadge estado={semaforo} />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <Card>
              <CardHeader
                titulo="Comparación mensual"
                descripcion="Barras: atenciones. Línea: desviación porcentual. Líneas rojas: umbral vigente."
                accion={<Badge tono="neutral">Plan vs SIC</Badge>}
              />
              <CardBody>
                <ComparativoChart datos={serie} umbral={configuracion.umbralDesviacion} />
              </CardBody>
            </Card>

            <UmbralControl configuracion={configuracion} />
          </div>

          <Card>
            <CardHeader
              titulo="Serie mensual del alcance"
              descripcion="La fila destacada corresponde al mes activo. El semáforo usa el umbral vigente."
              icono={<ClipboardList className="size-4" aria-hidden="true" />}
              accion={<Badge tono="brand">{serie.length} meses</Badge>}
            />
            <div className="scrollbar-sutil overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">
                  Comparación mensual entre planificado y SIC con desviación y semáforo
                </caption>
                <thead>
                  <tr className="border-b border-line bg-soft text-[11px] uppercase tracking-wide text-muted">
                    <th scope="col" className="px-5 py-2.5 font-semibold">Mes</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Planificado</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">SIC</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Diferencia</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Desviación</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Umbral</th>
                    <th scope="col" className="px-5 py-2.5 text-center font-semibold">Semáforo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {serie.map((punto) => {
                    const estado = clasificarDesviacion(
                      punto.indicadores.desviacion,
                      configuracion.umbralDesviacion,
                      punto.indicadores.planificado > 0,
                    );
                    const activo = punto.periodo === filtros.mes;
                    return (
                      <tr
                        key={punto.periodo}
                        className={activo ? 'bg-brand-50/60' : 'transition-colors hover:bg-soft'}
                      >
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-2 text-xs font-semibold text-ink">
                            {etiquetaPeriodo(punto.periodo)}
                            {activo ? <Badge tono="brand">Mes activo</Badge> : null}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-ink tabular">
                          {formatearNumero(punto.indicadores.planificado)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-ink tabular">
                          {formatearNumero(punto.indicadores.sic)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-muted tabular">
                          {formatearNumero(
                            punto.indicadores.sic - punto.indicadores.planificado,
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-ink tabular">
                          {formatearPctConSigno(punto.indicadores.desviacion)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-muted tabular">
                          ±{formatearPct(configuracion.umbralDesviacion)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <SemaforoBadge estado={estado} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader
              titulo="Profesionales fuera del umbral"
              descripcion={`Desviación absoluta mayor a ±${formatearPct(configuracion.umbralDesviacion)} en ${etiquetaPeriodo(filtros.mes)}.`}
              icono={<TriangleAlert className="size-4" aria-hidden="true" />}
              accion={
                <Badge tono={alertas.length > 0 ? 'danger' : 'success'}>
                  {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
                </Badge>
              }
            />
            {alertas.length === 0 ? (
              <EmptyState
                titulo="Ningún profesional supera el umbral"
                descripcion="La comparación del mes está dentro del rango configurado para todo el alcance."
                className="py-10"
              />
            ) : (
              <div className="scrollbar-sutil overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <caption className="sr-only">
                    Profesionales cuya desviación supera el umbral configurado
                  </caption>
                  <thead>
                    <tr className="border-b border-line bg-soft text-[11px] uppercase tracking-wide text-muted">
                      <th scope="col" className="px-5 py-2.5 font-semibold">Profesional</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Área</th>
                      <th scope="col" className="px-3 py-2.5 font-semibold">Cargo</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Planificado</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">SIC</th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">Desviación</th>
                      <th scope="col" className="px-3 py-2.5 text-center font-semibold">Semáforo</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {alertas.map((alerta) => (
                      <tr key={alerta.profesional.id} className="transition-colors hover:bg-soft">
                        <td className="px-5 py-3 text-xs font-semibold text-ink">
                          {alerta.profesional.nombre}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted">
                          {alerta.area?.nombre}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted">{alerta.cargo}</td>
                        <td className="px-3 py-3 text-right text-xs text-ink tabular">
                          {formatearNumero(alerta.indicadores.planificado)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-ink tabular">
                          {formatearNumero(alerta.indicadores.sic)}
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-danger tabular">
                          {formatearPctConSigno(alerta.indicadores.desviacion)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <SemaforoBadge estado={alerta.semaforo} compacto />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            to={`/mi-meta?${filtrosToQuery({
                              ...filtros,
                              profesional: alerta.profesional.id,
                            })}`}
                            className="text-[11px] font-semibold text-brand-700 hover:underline"
                          >
                            Ver ficha
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
