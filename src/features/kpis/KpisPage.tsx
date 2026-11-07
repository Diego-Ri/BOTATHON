import {
  Activity,
  Gauge,
  ListChecks,
  TriangleAlert,
} from 'lucide-react';
import { useMetas, useSerieMensual } from '@/data/queries';
import {
  brechaMetaGestion,
  clasificarDesviacion,
  semaforoDeIndicadores,
} from '@/domain/calc';
import {
  filasConsolidado,
  nivelConsolidado,
  totalConsolidado,
} from '@/domain/selectors';
import type { NivelTabla } from '@/domain/selectors';
import { useFiltros } from '@/components/filters/FiltersProvider';
import { FilterBar } from '@/components/filters/FilterBar';
import { ExportButton } from '@/components/export/ExportButton';
import { PageHeader } from '@/components/data/PageHeader';
import { KpiCard } from '@/components/data/KpiCard';
import { FormulaCard } from '@/components/data/FormulaCard';
import { TrazabilidadCard } from '@/components/data/TrazabilidadCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { SemaforoBadge } from '@/components/ui/Semaforo';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { TendenciaChart } from '@/components/charts/TendenciaChart';
import { useConfiguracion } from '@/store/configuracion';
import { useUsuarioActual } from '@/store/auth';
import { construirReporteConsolidado } from '@/lib/export/builders';
import {
  etiquetaPeriodo,
  formatearDecimal,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';
import { APP_SLUG } from '@/config/app';

const NOMBRE_NIVEL: Record<NivelTabla, string> = {
  instituto: 'Institutos',
  area: 'Áreas',
  profesional: 'Profesionales',
};

export default function KpisPage() {
  const usuario = useUsuarioActual();
  const { filtros, catalogo, scope, etiquetaAlcance, limpiar } = useFiltros();
  const configuracion = useConfiguracion();
  const metasQuery = useMetas(filtros, scope);
  const serieQuery = useSerieMensual(filtros, scope);

  if (!usuario) return null;

  const metas = metasQuery.data ?? [];
  const serie = serieQuery.data ?? [];
  const total = totalConsolidado(metas);
  const filas = filasConsolidado(metas, catalogo, filtros);
  const semaforo = semaforoDeIndicadores(total, configuracion);
  const brecha = brechaMetaGestion(total, configuracion);
  const nivel = nivelConsolidado(filtros);
  const cargando = metasQuery.isPending || serieQuery.isPending;
  const error = metasQuery.isError || serieQuery.isError;

  const construirReporte = () =>
    construirReporteConsolidado({
      usuario,
      filtros,
      catalogo,
      configuracion,
      metas,
      serie,
      titulo: 'KPIs de gestión',
      nombreBase: `${APP_SLUG}-kpis-${filtros.mes}`,
    });

  const cumpleMeta = total.metaGestion >= configuracion.metaGestionObjetivo;
  const cumpleFoja = total.foja >= configuracion.fojaObjetivo;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="KPIs de gestión"
        titulo="Indicadores y fórmulas"
        descripcion={`${etiquetaPeriodo(filtros.mes)} · ${etiquetaAlcance}. Meta de gestión y FOJA calculadas sobre los totales del alcance.`}
        acciones={
          !cargando && !error && metas.length > 0 ? (
            <ExportButton construir={construirReporte} />
          ) : undefined
        }
      />

      <FilterBar />

      {cargando ? <PageLoader etiqueta="Consolidando indicadores…" /> : null}

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
            titulo="Sin indicadores para los filtros activos"
            descripcion="No hay metas para combinar el alcance y el mes seleccionados. Restablece los filtros para volver al conjunto completo."
            accion={
              <Button variante="outline" tamano="sm" onClick={limpiar}>
                Restablecer filtros
              </Button>
            }
          />
        </Card>
      ) : null}

      {!cargando && !error && metas.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              etiqueta="Meta de gestión"
              valor={formatearPct(total.metaGestion)}
              descripcion="Atenciones realizadas sobre atenciones objetivo."
              icono={<Gauge className="size-4" aria-hidden="true" />}
              tono={cumpleMeta ? 'success' : 'warning'}
              meta={`Objetivo ${formatearPct(configuracion.metaGestionObjetivo)}`}
              estado={
                <Badge tono={cumpleMeta ? 'success' : 'warning'}>
                  {brecha >= 0 ? '+' : ''}
                  {formatearDecimal(brecha)} pp
                </Badge>
              }
            >
              <ProgressBar
                valor={total.metaGestion}
                meta={configuracion.metaGestionObjetivo}
                tono={cumpleMeta ? 'success' : 'warning'}
                etiqueta="Meta de gestión"
              />
              <p className="mt-1.5 text-[11px] text-muted tabular">
                {formatearNumero(total.atencionesRealizadas)} /{' '}
                {formatearNumero(total.atencionesObjetivo)} atenciones
              </p>
            </KpiCard>

            <KpiCard
              etiqueta="% FOJA"
              valor={formatearPct(total.foja)}
              descripcion="Horas asistenciales sobre horas contratadas."
              icono={<Activity className="size-4" aria-hidden="true" />}
              tono={cumpleFoja ? 'success' : 'warning'}
              meta={`Objetivo ${formatearPct(configuracion.fojaObjetivo)}`}
              estado={
                <Badge tono={cumpleFoja ? 'success' : 'warning'}>
                  {cumpleFoja ? 'Sobre objetivo' : 'Bajo objetivo'}
                </Badge>
              }
            >
              <ProgressBar
                valor={total.foja}
                meta={configuracion.fojaObjetivo}
                tono={cumpleFoja ? 'success' : 'warning'}
                etiqueta="FOJA"
              />
              <p className="mt-1.5 text-[11px] text-muted tabular">
                {formatearDecimal(total.horasAsistenciales)} h asistenciales /{' '}
                {formatearDecimal(total.horasContratadas)} h
              </p>
            </KpiCard>

            <KpiCard
              etiqueta="Desviación SIC"
              valor={formatearPctConSigno(total.desviacion)}
              descripcion="SIC frente al planificado del período."
              icono={<TriangleAlert className="size-4" aria-hidden="true" />}
              tono={
                semaforo === 'ok'
                  ? 'success'
                  : semaforo === 'atencion'
                    ? 'warning'
                    : 'danger'
              }
              meta={`Umbral ±${formatearPct(configuracion.umbralDesviacion)}`}
              estado={<SemaforoBadge estado={semaforo} />}
            >
              <div className="flex justify-between text-[11px] text-muted tabular">
                <span>{formatearNumero(total.planificado)} planificado</span>
                <span>{formatearNumero(total.sic)} SIC</span>
              </div>
            </KpiCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FormulaCard
              titulo="Fórmula · Meta de gestión"
              descripcion="Objetivo institucional: 90% de las atenciones comprometidas."
              formula="Atenciones realizadas ÷ Atenciones objetivo × 100"
              calculo={`${formatearNumero(total.atencionesRealizadas)} ÷ ${formatearNumero(total.atencionesObjetivo)} × 100`}
              resultado={`${formatearPct(total.metaGestion)} · objetivo ${formatearPct(configuracion.metaGestionObjetivo)}`}
              icono={<Gauge className="size-4" aria-hidden="true" />}
            />
            <FormulaCard
              titulo="Fórmula · % FOJA"
              descripcion="Ocupación de la jornada con horas directas e indirectas."
              formula="(Horas directas + Horas indirectas) ÷ Horas contratadas × 100"
              calculo={`(${formatearDecimal(total.horasDirectas)} + ${formatearDecimal(total.horasIndirectas)}) ÷ ${formatearDecimal(total.horasContratadas)} × 100`}
              resultado={`${formatearPct(total.foja)} · objetivo ${formatearPct(configuracion.fojaObjetivo)}`}
              icono={<Activity className="size-4" aria-hidden="true" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                titulo="Evolución de los indicadores"
                descripcion="La serie mantiene el alcance y excluye el filtro de mes."
                accion={<Badge tono="neutral">{serie.length} meses</Badge>}
              />
              <CardBody>
                <TendenciaChart
                  datos={serie}
                  metaGestion={configuracion.metaGestionObjetivo}
                />
              </CardBody>
            </Card>
            <TrazabilidadCard indicadores={total} configuracion={configuracion} />
          </div>

          <Card>
            <CardHeader
              titulo={`Detalle por ${NOMBRE_NIVEL[nivel].toLowerCase()}`}
              descripcion="Los porcentajes de cada fila y del total salen del mismo motor de cálculo."
              icono={<ListChecks className="size-4" aria-hidden="true" />}
              accion={<Badge tono="brand">{filas.length} filas</Badge>}
            />
            <div className="scrollbar-sutil overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <caption className="sr-only">
                  Indicadores de gestión por entidad, con fila de totales
                </caption>
                <thead>
                  <tr className="border-b border-line bg-soft text-[11px] uppercase tracking-wide text-muted">
                    <th scope="col" className="px-5 py-2.5 font-semibold">Entidad</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Prof.</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Meta atenciones</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Realizadas</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Meta gestión</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">FOJA</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Planificado</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">SIC</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Desviación</th>
                    <th scope="col" className="px-5 py-2.5 text-center font-semibold">Semáforo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filas.map((fila) => (
                    <tr key={fila.id} className="transition-colors hover:bg-soft">
                      <td className="px-5 py-3">
                        <p className="text-xs font-semibold text-ink">{fila.nombre}</p>
                        <p className="text-[10px] text-muted">{fila.sublabel}</p>
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-muted tabular">
                        {fila.profesionales}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-ink tabular">
                        {formatearNumero(fila.indicadores.atencionesObjetivo)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-ink tabular">
                        {formatearNumero(fila.indicadores.atencionesRealizadas)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span
                          className={`text-xs font-semibold tabular ${
                            fila.indicadores.metaGestion >= configuracion.metaGestionObjetivo
                              ? 'text-success-strong'
                              : 'text-warning-strong'
                          }`}
                        >
                          {formatearPct(fila.indicadores.metaGestion)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-ink tabular">
                        {formatearPct(fila.indicadores.foja)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-ink tabular">
                        {formatearNumero(fila.indicadores.planificado)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-ink tabular">
                        {formatearNumero(fila.indicadores.sic)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs font-medium text-ink tabular">
                        {formatearPctConSigno(fila.indicadores.desviacion)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <SemaforoBadge
                          estado={clasificarDesviacion(
                            fila.indicadores.desviacion,
                            configuracion.umbralDesviacion,
                            fila.indicadores.planificado > 0,
                          )}
                          compacto
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-soft text-xs font-semibold text-ink">
                    <td className="px-5 py-3">Total del alcance</td>
                    <td className="px-3 py-3 text-right tabular">{total.profesionales}</td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatearNumero(total.atencionesObjetivo)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatearNumero(total.atencionesRealizadas)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatearPct(total.metaGestion)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatearPct(total.foja)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatearNumero(total.planificado)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatearNumero(total.sic)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatearPctConSigno(total.desviacion)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <SemaforoBadge estado={semaforo} compacto />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3">
            <p className="text-[11px] text-muted">
              Meta de gestión = {formatearNumero(total.atencionesRealizadas)} ÷{' '}
              {formatearNumero(total.atencionesObjetivo)} × 100 ={' '}
              {formatearPct(total.metaGestion)} · FOJA ={' '}
              {formatearDecimal(total.horasAsistenciales)} ÷{' '}
              {formatearDecimal(total.horasContratadas)} × 100 ={' '}
              {formatearPct(total.foja)}
            </p>
            <Badge tono="success">Mismo motor de cálculo</Badge>
          </div>
        </>
      ) : null}
    </div>
  );
}
