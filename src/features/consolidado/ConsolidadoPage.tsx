import {
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Gauge,
  Globe2,
  Layers3,
  Target,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMetas, useSerieMensual } from '@/data/queries';
import { clasificarDesviacion, semaforoDeIndicadores } from '@/domain/calc';
import {
  filasConsolidado,
  nivelConsolidado,
  totalConsolidado,
  type NivelTabla,
} from '@/domain/selectors';
import { useFiltros } from '@/components/filters/FiltersProvider';
import { FilterBar } from '@/components/filters/FilterBar';
import { ExportButton } from '@/components/export/ExportButton';
import { PageHeader } from '@/components/data/PageHeader';
import { KpiCard } from '@/components/data/KpiCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { SemaforoBadge } from '@/components/ui/Semaforo';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback';
import { useConfiguracion } from '@/store/configuracion';
import { useUsuarioActual } from '@/store/auth';
import { construirReporteConsolidado } from '@/lib/export/builders';
import { filtrosToQuery } from '@/lib/filters';
import {
  etiquetaPeriodo,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';
import { APP_SLUG } from '@/config/app';

const NOMBRE_NIVEL: Record<NivelTabla, { singular: string; plural: string }> = {
  instituto: { singular: 'instituto', plural: 'institutos' },
  area: { singular: 'área', plural: 'áreas' },
  profesional: { singular: 'profesional', plural: 'profesionales' },
};

const ICONO_NIVEL: Record<NivelTabla, ReactNode> = {
  instituto: <Building2 className="size-4" aria-hidden="true" />,
  area: <Layers3 className="size-4" aria-hidden="true" />,
  profesional: <UserRound className="size-4" aria-hidden="true" />,
};

interface Migaja {
  etiqueta: string;
  actual: boolean;
  onClick?: () => void;
}

export default function ConsolidadoPage() {
  const usuario = useUsuarioActual();
  const { filtros, catalogo, scope, etiquetaAlcance, setFiltro, irA } = useFiltros();
  const configuracion = useConfiguracion();
  const metasQuery = useMetas(filtros, scope);
  const serieQuery = useSerieMensual(filtros, scope);

  if (!usuario) return null;

  const metas = metasQuery.data ?? [];
  const serie = serieQuery.data ?? [];
  const total = totalConsolidado(metas);
  const filas = filasConsolidado(metas, catalogo, filtros);
  const nivel = nivelConsolidado(filtros);
  const semaforo = semaforoDeIndicadores(total, configuracion);
  const cargando = metasQuery.isPending || serieQuery.isPending;
  const error = metasQuery.isError || serieQuery.isError;

  const institutoActual = catalogo.institutos.find((item) => item.id === filtros.instituto);
  const areaActual = catalogo.areas.find((item) => item.id === filtros.area);
  const profesionalActual = catalogo.profesionales.find(
    (item) => item.id === filtros.profesional,
  );
  const institutoScope = catalogo.institutos.find((item) => item.id === scope.institutoId);
  const areaScope = catalogo.areas.find((item) => item.id === scope.areaId);

  const migajas: Migaja[] = [];

  if (scope.areaId) {
    migajas.push({
      etiqueta: areaScope?.nombre ?? 'Área',
      actual: !filtros.profesional,
      onClick: () => irA({ profesional: undefined }),
    });
  } else if (scope.institutoId) {
    migajas.push({
      etiqueta: institutoScope?.sigla ?? 'Instituto',
      actual: !filtros.area && !filtros.profesional,
      onClick: () => irA({ area: undefined, profesional: undefined }),
    });
    if (areaActual) {
      migajas.push({
        etiqueta: areaActual.nombre,
        actual: !filtros.profesional,
        onClick: () => irA({ profesional: undefined }),
      });
    }
  } else {
    migajas.push({
      etiqueta: 'Nacional',
      actual: !filtros.instituto,
      onClick: () => irA({ instituto: undefined, area: undefined, profesional: undefined }),
    });
    if (institutoActual) {
      migajas.push({
        etiqueta: institutoActual.sigla,
        actual: !filtros.area && !filtros.profesional,
        onClick: () => irA({ area: undefined, profesional: undefined }),
      });
    }
    if (areaActual) {
      migajas.push({
        etiqueta: areaActual.nombre,
        actual: !filtros.profesional,
        onClick: () => irA({ profesional: undefined }),
      });
    }
  }

  if (profesionalActual) {
    migajas.push({ etiqueta: profesionalActual.nombre, actual: true });
  }

  const conciliado = filas.reduce(
    (suma, fila) => ({
      objetivo: suma.objetivo + fila.indicadores.atencionesObjetivo,
      realizadas: suma.realizadas + fila.indicadores.atencionesRealizadas,
      planificado: suma.planificado + fila.indicadores.planificado,
      sic: suma.sic + fila.indicadores.sic,
    }),
    { objetivo: 0, realizadas: 0, planificado: 0, sic: 0 },
  );
  const totalesConciliados =
    conciliado.objetivo === total.atencionesObjetivo &&
    conciliado.realizadas === total.atencionesRealizadas &&
    conciliado.planificado === total.planificado &&
    conciliado.sic === total.sic;

  const construirReporte = () =>
    construirReporteConsolidado({
      usuario,
      filtros,
      catalogo,
      configuracion,
      metas,
      serie,
      titulo:
        nivel === 'profesional'
          ? 'Consolidado de profesionales'
          : `Consolidado por ${NOMBRE_NIVEL[nivel].plural}`,
      nombreBase: `${APP_SLUG}-consolidado-${filtros.mes}`,
    });

  const sufijoConsolidado =
    areaActual?.nombre ?? institutoActual?.sigla ?? 'Instituto';

  const titulo =
    usuario.rol === 'direccion_nacional'
      ? filtros.instituto
        ? `Consolidado · ${sufijoConsolidado}`
        : 'Consolidado nacional'
      : usuario.rol === 'direccion_instituto'
        ? `Consolidado · ${filtros.area ? areaActual?.nombre ?? sufijoConsolidado : institutoScope?.sigla ?? 'Instituto'}`
        : `Consolidado · ${areaScope?.nombre ?? 'Área'}`;

  const irANivel = (fila: { id: string; nivel: NivelTabla }) => {
    if (fila.nivel === 'instituto') {
      setFiltro('instituto', fila.id);
      return;
    }
    if (fila.nivel === 'area') {
      setFiltro('area', fila.id);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Consolidado"
        titulo={titulo}
        descripcion={`${etiquetaPeriodo(filtros.mes)} · ${etiquetaAlcance}. Desglose nacional → instituto → área → profesional, con los totales recalculados en cada nivel.`}
        acciones={
          !cargando && !error && metas.length > 0 ? (
            <ExportButton construir={construirReporte} />
          ) : undefined
        }
      />

      <FilterBar />

      <nav
        aria-label="Ruta de desglose"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {migajas.map((migaja, indice) => (
            <li key={`${migaja.etiqueta}-${indice}`} className="flex items-center gap-1.5">
              {indice > 0 ? (
                <ChevronRight className="size-3.5 text-muted" aria-hidden="true" />
              ) : null}
              {migaja.actual ? (
                <span className="font-semibold text-ink" aria-current="page">
                  {migaja.etiqueta}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={migaja.onClick}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {migaja.etiqueta}
                </button>
              )}
            </li>
          ))}
        </ol>
        <Badge tono="brand" icono={<Globe2 className="size-3" aria-hidden="true" />}>
          Drill-down en 3 clics
        </Badge>
      </nav>

      {cargando ? <PageLoader etiqueta="Consolidando institutos, áreas y profesionales…" /> : null}

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

      {!cargando && !error && filas.length === 0 ? (
        <Card>
          <EmptyState
            titulo="Sin datos en este nivel"
            descripcion="No existen metas para la combinación de filtros. Sube un nivel en la ruta o restablece los filtros."
            accion={
              <Button variante="outline" tamano="sm" onClick={() => irA({ profesional: undefined })}>
                Subir un nivel
              </Button>
            }
          />
        </Card>
      ) : null}

      {!cargando && !error && filas.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              etiqueta="Profesionales"
              valor={formatearNumero(total.profesionales)}
              descripcion={`En ${filas.length} ${NOMBRE_NIVEL[nivel].plural} del alcance.`}
              icono={<UserRound className="size-4" aria-hidden="true" />}
              tono="brand"
            />
            <KpiCard
              etiqueta="Meta de gestión"
              valor={formatearPct(total.metaGestion)}
              descripcion="Atenciones realizadas sobre el objetivo."
              icono={<Gauge className="size-4" aria-hidden="true" />}
              tono={total.metaGestion >= configuracion.metaGestionObjetivo ? 'success' : 'warning'}
              meta={`Objetivo ${formatearPct(configuracion.metaGestionObjetivo)}`}
            >
              <ProgressBar
                valor={total.metaGestion}
                meta={configuracion.metaGestionObjetivo}
                tono={total.metaGestion >= configuracion.metaGestionObjetivo ? 'success' : 'warning'}
                etiqueta="Meta de gestión del alcance"
              />
            </KpiCard>
            <KpiCard
              etiqueta="% FOJA"
              valor={formatearPct(total.foja)}
              descripcion="Horas directas e indirectas sobre contratadas."
              icono={<Target className="size-4" aria-hidden="true" />}
              tono={total.foja >= configuracion.fojaObjetivo ? 'success' : 'warning'}
              meta={`Objetivo ${formatearPct(configuracion.fojaObjetivo)}`}
            />
            <KpiCard
              etiqueta="Desviación SIC"
              valor={formatearPctConSigno(total.desviacion)}
              descripcion="SIC frente al planificado del período."
              icono={<Layers3 className="size-4" aria-hidden="true" />}
              tono={
                semaforo === 'ok'
                  ? 'success'
                  : semaforo === 'atencion'
                    ? 'warning'
                    : 'danger'
              }
              meta={`Umbral ±${formatearPct(configuracion.umbralDesviacion)}`}
              estado={<SemaforoBadge estado={semaforo} />}
            />
          </div>

          <Card>
            <CardHeader
              titulo={`Desglose por ${NOMBRE_NIVEL[nivel].plural}`}
              descripcion={
                nivel === 'profesional'
                  ? 'Tercer nivel: abre la ficha individual desde la última columna.'
                  : `Selecciona una fila para bajar a ${nivel === 'instituto' ? 'áreas' : 'profesionales'}.`
              }
              icono={ICONO_NIVEL[nivel]}
              accion={
                <div className="flex items-center gap-2">
                  <Badge tono="neutral">
                    Nivel {nivel === 'instituto' ? '1' : nivel === 'area' ? '2' : '3'} de 3
                  </Badge>
                  <Badge
                    tono={totalesConciliados ? 'success' : 'warning'}
                    icono={
                      totalesConciliados ? (
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                      ) : undefined
                    }
                  >
                    {totalesConciliados ? 'Totales conciliados' : 'Revisar totales'}
                  </Badge>
                </div>
              }
            />
            <div className="scrollbar-sutil overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <caption className="sr-only">
                  Consolidado por {NOMBRE_NIVEL[nivel].plural}, con totales del alcance
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
                    <th scope="col" className="px-3 py-2.5 text-center font-semibold">Semáforo</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filas.map((fila) => (
                    <tr key={fila.id} className="group transition-colors hover:bg-soft">
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
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-semibold text-ink tabular">
                            {formatearPct(fila.indicadores.metaGestion)}
                          </span>
                          <div className="w-16">
                            <ProgressBar
                              valor={fila.indicadores.metaGestion}
                              tono={
                                fila.indicadores.metaGestion >=
                                configuracion.metaGestionObjetivo
                                  ? 'success'
                                  : 'warning'
                              }
                              etiqueta={`Meta de gestión de ${fila.nombre}`}
                            />
                          </div>
                        </div>
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
                      <td className="px-3 py-3 text-center">
                        <SemaforoBadge
                          estado={clasificarDesviacionFila(
                            fila.indicadores.desviacion,
                            fila.indicadores.planificado,
                            configuracion.umbralDesviacion,
                          )}
                          compacto
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {nivel === 'profesional' ? (
                          <Link
                            to={`/mi-meta?${filtrosToQuery({
                              ...filtros,
                              profesional: fila.id,
                            })}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                          >
                            Abrir ficha
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </Link>
                        ) : (
                          <Button
                            variante="outline"
                            tamano="sm"
                            onClick={() => irANivel(fila)}
                            icono={<ChevronRight className="size-3.5" aria-hidden="true" />}
                          >
                            {nivel === 'instituto' ? 'Ver áreas' : 'Ver profesionales'}
                          </Button>
                        )}
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
                    <td className="px-3 py-3 text-center">
                      <SemaforoBadge estado={semaforo} compacto />
                    </td>
                    <td className="px-5 py-3 text-right text-[10px] text-muted">
                      {filas.length} filas
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3">
            <p className="text-[11px] text-muted">
              El total del alcance se mantiene al navegar entre niveles. Cada fila
              usa los mismos registros crudos que el resto del panel.
            </p>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-success-strong">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              {formatearNumero(total.profesionales)} profesionales ·{' '}
              {formatearNumero(total.atencionesObjetivo)} atenciones objetivo
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function clasificarDesviacionFila(
  desviacion: number,
  planificado: number,
  umbral: number,
) {
  return clasificarDesviacion(desviacion, umbral, planificado > 0);
}
