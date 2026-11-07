import { useMemo } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarDays, Eye, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMetas, useSerieMensual } from '@/data/queries';
import { calcularDesdeRegistros, semaforoDeIndicadores } from '@/domain/calc';
import { filasPorProfesional } from '@/domain/selectors';
import type { Configuracion, Filtros, MetaMensual, PuntoSerie } from '@/domain/types';
import { useFiltros } from '@/components/filters/FiltersProvider';
import { FilterBar } from '@/components/filters/FilterBar';
import { ExportButton } from '@/components/export/ExportButton';
import { PageHeader } from '@/components/data/PageHeader';
import { FormulaCard } from '@/components/data/FormulaCard';
import { KpiCard } from '@/components/data/KpiCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { SemaforoBadge } from '@/components/ui/Semaforo';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { HorasChart } from '@/components/charts/HorasChart';
import { TendenciaChart } from '@/components/charts/TendenciaChart';
import { useConfiguracion } from '@/store/configuracion';
import { useUsuarioActual } from '@/store/auth';
import { construirReporteMiMeta } from '@/lib/export/builders';
import { filtrosToQuery } from '@/lib/filters';
import {
  etiquetaPeriodo,
  formatearDecimal,
  formatearHoras,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';

function TarjetaHoras({ metas }: { metas: MetaMensual[] }) {
  const indicadores = calcularDesdeRegistros(metas);
  return (
    <Card>
      <CardHeader
        titulo="Desglose de horas del mes"
        descripcion="Directas, indirectas y NAS. La suma debe cuadrar con las horas contratadas."
        icono={<CalendarDays className="size-4" aria-hidden="true" />}
      />
      <CardBody>
        <HorasChart indicadores={indicadores} />
        <p className="mt-4 rounded-lg bg-soft px-3 py-2 text-[11px] leading-relaxed text-muted">
          Horas contratadas = Horas directas + Horas indirectas + Horas NAS.
          FOJA = (directas + indirectas) ÷ contratadas × 100.
        </p>
      </CardBody>
    </Card>
  );
}

export default function MiMetaPage() {
  const usuario = useUsuarioActual();
  const { filtros, catalogo, scope, etiquetaAlcance, setFiltro, limpiar } = useFiltros();
  const configuracion = useConfiguracion();
  const metasQuery = useMetas(filtros, scope);
  const serieQuery = useSerieMensual(filtros, scope);

  const metas = metasQuery.data ?? [];
  const serie = serieQuery.data ?? [];
  const profesional = useMemo(
    () =>
      catalogo.profesionales.find((item) => item.id === filtros.profesional),
    [catalogo.profesionales, filtros.profesional],
  );
  const area = catalogo.areas.find((item) => item.id === profesional?.areaId);
  const instituto = catalogo.institutos.find(
    (item) => item.id === profesional?.institutoId,
  );
  const cargo = catalogo.cargos.find((item) => item.id === profesional?.cargoId);
  const filas = useMemo(
    () => filasPorProfesional(metas, catalogo, configuracion),
    [metas, catalogo, configuracion],
  );

  if (!usuario) return null;

  const cargando = metasQuery.isPending || serieQuery.isPending;
  const error = metasQuery.isError || serieQuery.isError;
  const esPropia = usuario.rol === 'profesional';
  const verDetalle = Boolean(profesional);

  const titulo = esPropia
    ? 'Mi meta del mes'
    : profesional
      ? `Meta de ${profesional.nombre}`
      : 'Meta por profesional';

  const construirReporte = () =>
    construirReporteMiMeta({
      usuario,
      filtros,
      catalogo,
      configuracion,
      metas,
      serie,
      titulo: profesional ? `Meta de ${profesional.nombre}` : 'Meta del mes',
    });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={esPropia ? 'Mi meta' : 'Metas individuales'}
        titulo={titulo}
        descripcion={`${etiquetaPeriodo(filtros.mes)} · ${etiquetaAlcance}. Atenciones objetivo, cumplimiento y composición de la jornada.`}
        acciones={
          <>
            {!esPropia && verDetalle ? (
              <Button
                variante="ghost"
                tamano="sm"
                onClick={limpiar}
                icono={<ArrowLeft className="size-3.5" aria-hidden="true" />}
              >
                Ver lista
              </Button>
            ) : null}
            {verDetalle ? <ExportButton construir={construirReporte} /> : null}
          </>
        }
      />

      <FilterBar />

      {cargando ? <PageLoader etiqueta="Calculando la meta del mes…" /> : null}

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

      {!cargando && !error && !verDetalle ? (
        <Card>
          <CardHeader
            titulo={`${filas.length} profesionales en el alcance`}
            descripcion="Selecciona una persona para ver su meta mensual y el desglose de horas. Un clic."
            accion={<Badge tono="brand">1 clic</Badge>}
          />
          {filas.length === 0 ? (
            <EmptyState
              titulo="Sin profesionales para estos filtros"
              descripcion="Prueba con otro cargo, área o mes. Los filtros activos se mantienen en la URL."
            />
          ) : (
            <div className="scrollbar-sutil overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">
                  Profesionales del alcance con su meta de gestión y FOJA
                </caption>
                <thead>
                  <tr className="border-b border-line bg-soft text-[11px] uppercase tracking-wide text-muted">
                    <th scope="col" className="px-5 py-2.5 font-semibold">Profesional</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Área</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Cargo</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Meta gestión</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">FOJA</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">Desviación</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filas.map((fila) => (
                    <tr key={fila.profesional.id} className="transition-colors hover:bg-soft">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            nombre={fila.profesional.nombre}
                            iniciales={fila.profesional.nombre
                              .split(' ')
                              .slice(0, 2)
                              .map((parte) => parte[0])
                              .join('')}
                            tamano="sm"
                          />
                          <div>
                            <p className="text-xs font-semibold text-ink">
                              {fila.profesional.nombre}
                            </p>
                            <p className="text-[10px] text-muted">
                              {fila.instituto?.sigla}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted">{fila.area?.nombre}</td>
                      <td className="px-3 py-3 text-xs text-muted">{fila.cargo}</td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-ink tabular">
                        {formatearPct(fila.indicadores.metaGestion)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-ink tabular">
                        {formatearPct(fila.indicadores.foja)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-medium text-ink tabular">
                            {formatearPctConSigno(fila.indicadores.desviacion)}
                          </span>
                          <SemaforoBadge estado={fila.semaforo} compacto />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variante="outline"
                          tamano="sm"
                          onClick={() => setFiltro('profesional', fila.profesional.id)}
                          icono={<Eye className="size-3.5" aria-hidden="true" />}
                        >
                          Ver meta
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {!cargando && !error && profesional ? (
        <ContenidoMeta
          metas={metas}
          serie={serie}
          configuracion={configuracion}
          profesionalNombre={profesional.nombre}
          profesionalCargo={cargo?.nombre ?? 'Sin cargo'}
          areaNombre={area?.nombre ?? 'Sin área'}
          institutoNombre={instituto?.nombre ?? 'Sin instituto'}
          filtros={filtros}
          onLimpiar={limpiar}
          esPropia={esPropia}
        />
      ) : null}
    </div>
  );
}

interface ContenidoMetaProps {
  metas: MetaMensual[];
  serie: PuntoSerie[];
  configuracion: Configuracion;
  profesionalNombre: string;
  profesionalCargo: string;
  areaNombre: string;
  institutoNombre: string;
  filtros: Filtros;
  onLimpiar: () => void;
  esPropia: boolean;
}

function ContenidoMeta({
  metas,
  serie,
  configuracion,
  profesionalNombre,
  profesionalCargo,
  areaNombre,
  institutoNombre,
  filtros,
  onLimpiar,
  esPropia,
}: ContenidoMetaProps) {
  const indicadores = calcularDesdeRegistros(metas);
  const semaforo = semaforoDeIndicadores(indicadores, configuracion);
  const brecha = indicadores.metaGestion - configuracion.metaGestionObjetivo;
  const cumpleMeta = brecha >= 0;
  const tonoRing = cumpleMeta ? 'success' : brecha >= -10 ? 'warning' : 'danger';
  const iniciales = profesionalNombre
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('');

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-gradient-to-r from-brand-50/80 to-white px-5 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  nombre={profesionalNombre}
                  iniciales={iniciales}
                  tamano="lg"
                />
                <div>
                  <h2 className="text-lg font-semibold text-ink">{profesionalNombre}</h2>
                  <p className="text-xs text-muted">
                    {profesionalCargo} · {areaNombre} · {institutoNombre}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tono="brand">{etiquetaPeriodo(filtros.mes)}</Badge>
                    <Badge tono={cumpleMeta ? 'success' : 'warning'}>
                      {cumpleMeta ? 'Sobre la meta' : 'Bajo la meta'}
                    </Badge>
                  </div>
                </div>
              </div>
              {!esPropia ? (
                <Button
                  variante="ghost"
                  tamano="sm"
                  onClick={onLimpiar}
                  className="self-start"
                >
                  Cambiar profesional
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Atenciones objetivo
              </p>
              <p className="mt-1 text-3xl font-semibold text-ink tabular">
                {formatearNumero(indicadores.atencionesObjetivo)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">meta mensual</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Atenciones realizadas
              </p>
              <p className="mt-1 text-3xl font-semibold text-ink tabular">
                {formatearNumero(indicadores.atencionesRealizadas)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {formatearPct(indicadores.metaGestion)} de cumplimiento
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Meta de gestión
              </p>
              <p className="mt-1 text-3xl font-semibold text-ink tabular">
                {formatearPct(indicadores.metaGestion)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                objetivo {formatearPct(configuracion.metaGestionObjetivo)}
              </p>
            </div>
            <div className="sm:col-span-3">
              <ProgressBar
                valor={indicadores.metaGestion}
                meta={configuracion.metaGestionObjetivo}
                tono={cumpleMeta ? 'success' : brecha >= -10 ? 'warning' : 'danger'}
                etiqueta="Cumplimiento de la meta de gestión"
              />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                <span>{formatearPct(indicadores.metaGestion)}</span>
                <span>
                  Meta {formatearPct(configuracion.metaGestionObjetivo)} ·{' '}
                  {brecha >= 0 ? '+' : ''}
                  {formatearDecimal(brecha)} pp
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-3 p-5">
          <ProgressRing
            valor={indicadores.metaGestion}
            tono={tonoRing}
            etiqueta={`Meta de gestión ${formatearPct(indicadores.metaGestion)}`}
          >
            <div className="text-center">
              <p className="text-3xl font-semibold text-ink tabular">
                {formatearPct(indicadores.metaGestion)}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Meta de gestión
              </p>
            </div>
          </ProgressRing>
          <Badge tono={cumpleMeta ? 'success' : 'warning'}>
            Objetivo {formatearPct(configuracion.metaGestionObjetivo)}
          </Badge>
          <p className="text-center text-[11px] leading-relaxed text-muted">
            {formatearNumero(indicadores.atencionesRealizadas)} de{' '}
            {formatearNumero(indicadores.atencionesObjetivo)} atenciones
            comprometidas.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <TarjetaHoras metas={metas} />

        <div className="grid gap-4">
          <KpiCard
            etiqueta="Desviación planificado vs SIC"
            valor={formatearPctConSigno(indicadores.desviacion)}
            descripcion="SIC frente a lo planificado en el mes."
            icono={<Target className="size-4" aria-hidden="true" />}
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
            <Link
              to={`/planificado?${filtrosToQuery(filtros)}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:underline"
            >
              Ver comparación mensual
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </KpiCard>

          <Card className="p-4">
            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Planificado</dt>
                <dd className="font-semibold text-ink tabular">
                  {formatearNumero(indicadores.planificado)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">SIC</dt>
                <dd className="font-semibold text-ink tabular">
                  {formatearNumero(indicadores.sic)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Diferencia</dt>
                <dd className="font-semibold text-ink tabular">
                  {formatearNumero(indicadores.sic - indicadores.planificado)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-2.5">
                <dt className="text-muted">Horas contratadas</dt>
                <dd className="font-semibold text-ink tabular">
                  {formatearHoras(indicadores.horasContratadas)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FormulaCard
          titulo="Meta de gestión"
          descripcion="Cumplimiento sobre las atenciones comprometidas."
          formula="Atenciones realizadas ÷ Atenciones objetivo × 100"
          calculo={`${formatearNumero(indicadores.atencionesRealizadas)} ÷ ${formatearNumero(indicadores.atencionesObjetivo)} × 100`}
          resultado={`${formatearPct(indicadores.metaGestion)} · objetivo ${formatearPct(configuracion.metaGestionObjetivo)}`}
        />
        <FormulaCard
          titulo="% FOJA"
          descripcion="Ocupación de la jornada con horas asistenciales."
          formula="(Horas directas + Horas indirectas) ÷ Horas contratadas × 100"
          calculo={`(${formatearDecimal(indicadores.horasDirectas)} + ${formatearDecimal(indicadores.horasIndirectas)}) ÷ ${formatearDecimal(indicadores.horasContratadas)} × 100`}
          resultado={`${formatearPct(indicadores.foja)} · objetivo ${formatearPct(configuracion.fojaObjetivo)}`}
        />
      </div>

      <Card>
        <CardHeader
          titulo={`Evolución de ${profesionalNombre.split(' ')[0]}`}
          descripcion="Meta de gestión y FOJA de los últimos meses."
          accion={<Badge tono="neutral">{serie.length} meses</Badge>}
        />
        <CardBody>
          <TendenciaChart datos={serie} metaGestion={configuracion.metaGestionObjetivo} />
        </CardBody>
      </Card>
    </>
  );
}
