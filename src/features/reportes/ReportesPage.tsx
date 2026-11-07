import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  FileText,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useMetas, useSerieMensual } from '@/data/queries';
import { clasificarDesviacion } from '@/domain/calc';
import { filasConsolidado, totalConsolidado } from '@/domain/selectors';
import { useFiltros } from '@/components/filters/FiltersProvider';
import { FilterBar } from '@/components/filters/FilterBar';
import { PageHeader } from '@/components/data/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SemaforoBadge } from '@/components/ui/Semaforo';
import { EmptyState, ErrorState, InlineAlert, PageLoader } from '@/components/ui/Feedback';
import { useConfiguracion } from '@/store/configuracion';
import { useUsuarioActual } from '@/store/auth';
import { construirReporteConsolidado } from '@/lib/export/builders';
import { exportarReporte } from '@/lib/export';
import {
  leerHistorial,
  registrarExportacion,
  type ExportacionHistorial,
  type FormatoExportacion,
} from '@/lib/export/history';
import {
  etiquetaPeriodo,
  formatearFechaHora,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';
import { cn } from '@/lib/cn';
import { APP_SLUG } from '@/config/app';

export default function ReportesPage() {
  const usuario = useUsuarioActual();
  const { filtros, catalogo, scope, etiquetaAlcance } = useFiltros();
  const configuracion = useConfiguracion();
  const metasQuery = useMetas(filtros, scope);
  const serieQuery = useSerieMensual(filtros, scope);
  const [formato, setFormato] = useState<FormatoExportacion>('pdf');
  const [exportando, setExportando] = useState(false);
  const [mensaje, setMensaje] = useState<
    { tono: 'success' | 'danger'; texto: string } | null
  >(null);
  const [historial, setHistorial] = useState<ExportacionHistorial[]>([]);

  useEffect(() => {
    const actualizar = () => setHistorial(leerHistorial());
    actualizar();
    window.addEventListener(`${APP_SLUG}:exportacion`, actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener(`${APP_SLUG}:exportacion`, actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  if (!usuario) return null;

  const metas = metasQuery.data ?? [];
  const serie = serieQuery.data ?? [];
  const total = totalConsolidado(metas);
  const filas = filasConsolidado(metas, catalogo, filtros);
  const cargando = metasQuery.isPending || serieQuery.isPending;
  const error = metasQuery.isError || serieQuery.isError;

  const reporte = useMemo(
    () =>
      construirReporteConsolidado({
        usuario,
        filtros,
        catalogo,
        configuracion,
        metas,
        serie,
        titulo: 'Reporte de gestión',
        nombreBase: `${APP_SLUG}-reporte-${filtros.mes}`,
      }),
    [usuario, filtros, catalogo, configuracion, metas, serie],
  );

  const exportar = async () => {
    setExportando(true);
    setMensaje(null);
    try {
      const actual = construirReporteConsolidado({
        usuario,
        filtros,
        catalogo,
        configuracion,
        metas,
        serie,
        titulo: 'Reporte de gestión',
        nombreBase: `${APP_SLUG}-reporte-${filtros.mes}`,
      });
      await exportarReporte(actual, formato);
      registrarExportacion(actual, formato);
      setMensaje({
        tono: 'success',
        texto: `El archivo ${formato === 'pdf' ? 'PDF' : 'Excel'} se generó con los filtros activos.`,
      });
    } catch (causa) {
      setMensaje({
        tono: 'danger',
        texto:
          causa instanceof Error
            ? `No se pudo exportar: ${causa.message}`
            : 'No se pudo generar el archivo. Intenta nuevamente.',
      });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Reportes"
        titulo="Exportación de la vista filtrada"
        descripcion={`${etiquetaPeriodo(filtros.mes)} · ${etiquetaAlcance}. Genera un PDF o Excel para jefaturas; ambos incluyen filtros, parámetros y trazabilidad.`}
        acciones={<Badge tono="brand">PDF + Excel</Badge>}
      />

      <FilterBar />

      {cargando ? <PageLoader etiqueta="Preparando la vista previa…" /> : null}

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
            titulo="No hay información para exportar"
            descripcion="La combinación de filtros no tiene registros. Ajusta el alcance o el mes antes de generar el archivo."
          />
        </Card>
      ) : null}

      {!cargando && !error && metas.length > 0 ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader
                titulo="Vista previa del reporte"
                descripcion={reporte.subtitulo}
                accion={<Badge tono="neutral">{filas.length} filas de detalle</Badge>}
              />
              <CardBody className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-soft p-3 ring-1 ring-inset ring-line">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Meta de gestión
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink tabular">
                      {formatearPct(total.metaGestion)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-soft p-3 ring-1 ring-inset ring-line">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      % FOJA
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink tabular">
                      {formatearPct(total.foja)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-soft p-3 ring-1 ring-inset ring-line">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Desviación SIC
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink tabular">
                      {formatearPctConSigno(total.desviacion)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-soft p-3 ring-1 ring-inset ring-line">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Profesionales
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink tabular">
                      {formatearNumero(total.profesionales)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Filtros que quedarán en el archivo
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {reporte.contexto.filtros.map((filtro) => (
                      <li
                        key={filtro.etiqueta}
                        className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-muted"
                      >
                        <span className="font-semibold text-ink">
                          {filtro.etiqueta}:
                        </span>{' '}
                        {filtro.valor}
                      </li>
                    ))}
                    <li className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-muted">
                      <span className="font-semibold text-ink">Umbral:</span> ±
                      {formatearPct(configuracion.umbralDesviacion)}
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Secciones incluidas
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {reporte.hojas.map((hoja) => (
                      <li
                        key={hoja.nombre}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2"
                      >
                        <span className="text-xs font-medium text-ink">{hoja.nombre}</span>
                        <span className="text-[10px] text-muted">{hoja.filas.length} filas</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="scrollbar-sutil overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <caption className="sr-only">
                      Vista previa del detalle que se exportará
                    </caption>
                    <thead>
                      <tr className="border-b border-line bg-soft text-[10px] uppercase tracking-wide text-muted">
                        <th scope="col" className="px-3 py-2 font-semibold">Entidad</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Prof.</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Realizadas</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Meta</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">FOJA</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Desviación</th>
                        <th scope="col" className="px-3 py-2 text-center font-semibold">Semáforo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filas.slice(0, 6).map((fila) => (
                        <tr key={fila.id}>
                          <td className="px-3 py-2.5">
                            <p className="text-xs font-semibold text-ink">{fila.nombre}</p>
                            <p className="text-[10px] text-muted">{fila.sublabel}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-muted tabular">
                            {fila.profesionales}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-ink tabular">
                            {formatearNumero(fila.indicadores.atencionesRealizadas)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-ink tabular">
                            {formatearPct(fila.indicadores.metaGestion)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-ink tabular">
                            {formatearPct(fila.indicadores.foja)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-ink tabular">
                            {formatearPctConSigno(fila.indicadores.desviacion)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
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
                  </table>
                  {filas.length > 6 ? (
                    <p className="border-t border-line bg-soft px-3 py-2 text-[10px] text-muted">
                      + {filas.length - 6} filas más en el archivo exportado.
                    </p>
                  ) : null}
                </div>
              </CardBody>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader
                  titulo="Generar archivo"
                  descripcion={`${reporte.hojas.length} secciones · ${etiquetaPeriodo(filtros.mes)}`}
                  icono={<FileDown className="size-4" aria-hidden="true" />}
                />
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormato('pdf')}
                      aria-pressed={formato === 'pdf'}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-colors',
                        formato === 'pdf'
                          ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15'
                          : 'border-line bg-white hover:border-line-strong',
                      )}
                    >
                      <FileText className="size-5 text-danger" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-ink">PDF</p>
                      <p className="text-[10px] text-muted">Listo para imprimir</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormato('xlsx')}
                      aria-pressed={formato === 'xlsx'}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-colors',
                        formato === 'xlsx'
                          ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15'
                          : 'border-line bg-white hover:border-line-strong',
                      )}
                    >
                      <FileSpreadsheet className="size-5 text-success" aria-hidden="true" />
                      <p className="mt-2 text-sm font-semibold text-ink">Excel</p>
                      <p className="text-[10px] text-muted">Hojas y autofiltro</p>
                    </button>
                  </div>

                  <Button
                    onClick={() => void exportar()}
                    cargando={exportando}
                    className="w-full"
                    icono={<FileDown className="size-4" aria-hidden="true" />}
                  >
                    Generar {formato === 'pdf' ? 'PDF' : 'Excel'}
                  </Button>

                  {mensaje ? (
                    <InlineAlert
                      tono={mensaje.tono}
                      titulo={mensaje.tono === 'success' ? 'Archivo generado' : 'Error'}
                    >
                      {mensaje.texto}
                    </InlineAlert>
                  ) : null}

                  <div className="flex items-start gap-2 rounded-lg bg-soft px-3 py-2.5 text-[11px] leading-relaxed text-muted ring-1 ring-inset ring-line">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                    <p>
                      El archivo respeta el alcance del rol y los filtros activos.
                      El backend debe revalidar ambas condiciones al conectar la API.
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  titulo="Historial reciente"
                  descripcion="Últimas exportaciones en este navegador."
                  icono={<History className="size-4" aria-hidden="true" />}
                  accion={<Badge tono="neutral">{historial.length}</Badge>}
                />
                {historial.length === 0 ? (
                  <EmptyState
                    titulo="Aún no hay exportaciones"
                    descripcion="Cuando generes un archivo, quedará registrado aquí."
                    className="py-8"
                  />
                ) : (
                  <ul className="divide-y divide-line">
                    {historial.slice(0, 5).map((item) => (
                      <li key={item.id} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.formato === 'pdf' ? (
                            <FileText className="size-4 shrink-0 text-danger" aria-hidden="true" />
                          ) : (
                            <FileSpreadsheet className="size-4 shrink-0 text-success" aria-hidden="true" />
                          )}
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                            {item.titulo}
                          </p>
                          <Badge tono="neutral">{item.formato.toUpperCase()}</Badge>
                        </div>
                        <p className="mt-1 text-[10px] text-muted">
                          {formatearFechaHora(item.fecha)} · {item.usuario}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">
                          {item.filtros}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[11px] leading-relaxed text-muted">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <p>
              La vista previa, el PDF y el Excel usan el mismo motor de cálculo.
              Los totales exportados coinciden con los del consolidado para los
              filtros activos.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
