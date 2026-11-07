import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  Gauge,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMetas, useSerieMensual } from '@/data/queries';
import {
  semaforoDeIndicadores,
  brechaMetaGestion,
} from '@/domain/calc';
import { puedeVerConsolidado } from '@/domain/permissions';
import {
  alertasDeDesviacion,
  filasConsolidado,
  nivelConsolidado,
  totalConsolidado,
} from '@/domain/selectors';
import type { Semaforo } from '@/domain/types';
import { useFiltros } from '@/components/filters/FiltersProvider';
import { FilterBar } from '@/components/filters/FilterBar';
import { ExportButton } from '@/components/export/ExportButton';
import { PageHeader } from '@/components/data/PageHeader';
import { KpiCard } from '@/components/data/KpiCard';
import { TrazabilidadCard } from '@/components/data/TrazabilidadCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SemaforoBadge } from '@/components/ui/Semaforo';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { BarrasMetaChart } from '@/components/charts/BarrasMetaChart';
import { HorasChart } from '@/components/charts/HorasChart';
import { TendenciaChart } from '@/components/charts/TendenciaChart';
import { useConfiguracion } from '@/store/configuracion';
import { useUsuarioActual } from '@/store/auth';
import { construirReporteConsolidado } from '@/lib/export/builders';
import { filtrosToQuery } from '@/lib/filters';
import {
  etiquetaPeriodo,
  formatearDecimal,
  formatearHoras,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';
import type { Configuracion, Indicadores } from '@/domain/types';
import { APP_SLUG } from '@/config/app';

function tonoMeta(indicadores: Indicadores, configuracion: Configuracion) {
  if (indicadores.metaGestion >= configuracion.metaGestionObjetivo) return 'success';
  if (indicadores.metaGestion >= configuracion.metaGestionObjetivo * 0.9) {
    return 'warning';
  }
  return 'danger';
}

const TONO_SEMAFORO: Record<Semaforo, 'success' | 'warning' | 'danger' | 'info'> = {
  ok: 'success',
  atencion: 'warning',
  alerta: 'danger',
  'sin-datos': 'info',
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando panel">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((indice) => (
          <div key={indice} className="card-base p-5">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="mt-5 h-3 w-24" />
            <Skeleton className="mt-2 h-8 w-20" />
            <Skeleton className="mt-3 h-2 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card-base p-5 xl:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-72 w-full" />
        </div>
        <div className="card-base p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-20 w-full" />
          <Skeleton className="mt-3 h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const usuario = useUsuarioActual();
  const { filtros, catalogo, scope, etiquetaAlcance, limpiar } = useFiltros();
  const configuracion = useConfiguracion();
  const metasQuery = useMetas(filtros, scope);
  const serieQuery = useSerieMensual(filtros, scope);

  if (!usuario) return null;

  const cargando = metasQuery.isPending || serieQuery.isPending;
  const error = metasQuery.isError || serieQuery.isError;
  const metas = metasQuery.data ?? [];
  const serie = serieQuery.data ?? [];
  const total = totalConsolidado(metas);
  const semaforo = semaforoDeIndicadores(total, configuracion);
  const alertas = alertasDeDesviacion(metas, catalogo, configuracion);
  const filas = filasConsolidado(metas, catalogo, filtros);
  const brecha = brechaMetaGestion(total, configuracion);
  const primerNombre = usuario.nombre.split(' ')[0];
  const puedeConsolidar = puedeVerConsolidado(usuario.rol);

  const construirReporte = () =>
    construirReporteConsolidado({
      usuario,
      filtros,
      catalogo,
      configuracion,
      metas,
      serie,
      titulo:
        usuario.rol === 'profesional'
          ? 'Panel personal de metas'
          : 'Panel de gestión',
      nombreBase: `${APP_SLUG}-inicio-${filtros.mes}`,
    });

  const acciones =
    !cargando && !error && puedeConsolidar ? (
      <ExportButton construir={construirReporte} />
    ) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inicio"
        titulo={
          usuario.rol === 'profesional'
            ? `Hola, ${primerNombre}`
            : 'Panel de gestión'
        }
        descripcion={`${etiquetaPeriodo(filtros.mes)} · ${etiquetaAlcance}. Revisa el cumplimiento, la composición de horas y las desviaciones del período.`}
        acciones={acciones}
      />

      <FilterBar />

      {cargando ? <DashboardSkeleton /> : null}

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
            titulo="No hay registros para esta combinación"
            descripcion="Los filtros son válidos, pero no existen metas para el mes y el alcance seleccionados. Prueba con otro cargo, área o mes."
            accion={
              <Button variante="ghost" tamano="sm" onClick={limpiar}>
                Restablecer filtros
              </Button>
            }
          />
        </Card>
      ) : null}

      {!cargando && !error && metas.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              etiqueta="Meta de gestión"
              valor={formatearPct(total.metaGestion)}
              descripcion="Atenciones realizadas sobre las atenciones objetivo."
              icono={<Gauge className="size-4" aria-hidden="true" />}
              tono={tonoMeta(total, configuracion)}
              meta={`Objetivo ${formatearPct(configuracion.metaGestionObjetivo)}`}
              estado={
                <Badge tono={total.metaGestion >= configuracion.metaGestionObjetivo ? 'success' : 'warning'}>
                  {brecha >= 0 ? '+' : ''}
                  {formatearDecimal(brecha)} pp
                </Badge>
              }
            >
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>
                  {formatearNumero(total.atencionesRealizadas)} /{' '}
                  {formatearNumero(total.atencionesObjetivo)}
                </span>
                <span>atenciones</span>
              </div>
            </KpiCard>

            <KpiCard
              etiqueta="% FOJA"
              valor={formatearPct(total.foja)}
              descripcion="Horas directas + indirectas sobre horas contratadas."
              icono={<Activity className="size-4" aria-hidden="true" />}
              tono={
                total.foja >= configuracion.fojaObjetivo
                  ? 'success'
                  : total.foja >= configuracion.fojaObjetivo * 0.9
                    ? 'warning'
                    : 'danger'
              }
              meta={`Objetivo ${formatearPct(configuracion.fojaObjetivo)}`}
            >
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{formatearHoras(total.horasAsistenciales)} asistenciales</span>
                <span>{formatearHoras(total.horasContratadas)}</span>
              </div>
            </KpiCard>

            <KpiCard
              etiqueta="Desviación SIC"
              valor={formatearPctConSigno(total.desviacion)}
              descripcion="Diferencia entre SIC y planificado del período."
              icono={<ArrowLeftRight className="size-4" aria-hidden="true" />}
              tono={TONO_SEMAFORO[semaforo]}
              meta={`Umbral ±${formatearPct(configuracion.umbralDesviacion)}`}
              estado={<SemaforoBadge estado={semaforo} />}
            >
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{formatearNumero(total.planificado)} planificado</span>
                <span>{formatearNumero(total.sic)} SIC</span>
              </div>
            </KpiCard>

            <KpiCard
              etiqueta="Profesionales en alerta"
              valor={formatearNumero(alertas.length)}
              descripcion="Desviación absoluta sobre el umbral configurado."
              icono={<TriangleAlert className="size-4" aria-hidden="true" />}
              tono={alertas.length > 0 ? 'danger' : 'success'}
              meta={`${formatearNumero(total.profesionales)} profesionales en alcance`}
              estado={
                <Badge tono={alertas.length > 0 ? 'danger' : 'success'}>
                  {alertas.length > 0 ? 'Requiere revisión' : 'Sin alertas'}
                </Badge>
              }
            >
              <Link
                to={`/planificado?${filtrosToQuery(filtros)}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
              >
                Ver comparación
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </KpiCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                titulo="Evolución de indicadores"
                descripcion="Meta de gestión y FOJA de los últimos meses, con el filtro de mes excluido."
                accion={<Badge tono="neutral">{serie.length} meses</Badge>}
              />
              <CardBody>
                <TendenciaChart
                  datos={serie}
                  metaGestion={configuracion.metaGestionObjetivo}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                titulo="Alertas de desviación"
                descripcion="Profesionales por sobre el umbral vigente."
                accion={
                  <Badge tono={alertas.length > 0 ? 'danger' : 'success'}>
                    {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
                  </Badge>
                }
              />
              <CardBody className="p-0">
                {alertas.length === 0 ? (
                  <EmptyState
                    titulo="Sin desviaciones críticas"
                    descripcion={`Ningún profesional supera el umbral de ±${formatearPct(configuracion.umbralDesviacion)}.`}
                    className="py-10"
                  />
                ) : (
                  <>
                    <ul className="divide-y divide-line">
                      {alertas.slice(0, 4).map((alerta) => (
                        <li key={alerta.profesional.id}>
                          <Link
                            to={`/planificado?${filtrosToQuery({
                              ...filtros,
                              profesional: alerta.profesional.id,
                            })}`}
                            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-soft"
                          >
                            <Avatar
                              nombre={alerta.profesional.nombre}
                              iniciales={alerta.profesional.nombre
                                .split(' ')
                                .slice(0, 2)
                                .map((parte) => parte[0])
                                .join('')}
                              tamano="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-ink">
                                {alerta.profesional.nombre}
                              </p>
                              <p className="truncate text-[11px] text-muted">
                                {alerta.area?.nombre} · {alerta.cargo}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-danger tabular">
                                {formatearPctConSigno(alerta.indicadores.desviacion)}
                              </p>
                              <SemaforoBadge estado={alerta.semaforo} compacto />
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-line px-5 py-3">
                      <Link
                        to={`/planificado?${filtrosToQuery(filtros)}`}
                        className="text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        Ver las {alertas.length} alertas →
                      </Link>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {puedeConsolidar ? (
              <>
                <Card>
                  <CardHeader
                    titulo="Meta de gestión por entidad"
                    descripcion={`Nivel ${nivelConsolidado(filtros)} con los filtros activos.`}
                    accion={
                      <Link
                        to={`/consolidado?${filtrosToQuery(filtros)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
                      >
                        Ver consolidado
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                      </Link>
                    }
                  />
                  <CardBody>
                    <BarrasMetaChart
                      filas={filas}
                      meta={configuracion.metaGestionObjetivo}
                    />
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    titulo="Composición de horas"
                    descripcion="Directas, indirectas y NAS del período filtrado."
                  />
                  <CardBody>
                    <HorasChart indicadores={total} />
                  </CardBody>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader
                    titulo="Composición de horas"
                    descripcion="Directas, indirectas y NAS del período filtrado."
                  />
                  <CardBody>
                    <HorasChart indicadores={total} />
                  </CardBody>
                </Card>
                <TrazabilidadCard
                  indicadores={total}
                  configuracion={configuracion}
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3">
            <p className="text-[11px] text-muted">
              {formatearNumero(total.profesionales)} profesionales ·{' '}
              {formatearNumero(total.atencionesObjetivo)} atenciones objetivo ·{' '}
              {formatearNumero(total.planificado)} planificado
            </p>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-success-strong">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              Totales conciliados con el motor
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
