import { useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, Lock } from 'lucide-react';
import type { Reporte } from '@/lib/export/types';
import type { FormatoExportacion } from '@/lib/export/history';
import { exportarReporte } from '@/lib/export';
import { registrarExportacion } from '@/lib/export/history';
import { formatearFechaHora } from '@/lib/format';
import { useUsuarioActual } from '@/store/auth';
import { puedeExportar } from '@/domain/permissions';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { InlineAlert } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';

interface ExportButtonProps {
  construir: () => Reporte;
  etiqueta?: string;
  variante?: 'primary' | 'secondary' | 'outline' | 'ghost';
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExportButton({
  construir,
  etiqueta = 'Exportar',
  variante = 'outline',
  tamano = 'sm',
  className,
}: ExportButtonProps) {
  const usuario = useUsuarioActual();
  const [abierto, setAbierto] = useState(false);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [formato, setFormato] = useState<FormatoExportacion>('pdf');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!usuario || !puedeExportar(usuario.rol)) return null;

  const abrir = () => {
    try {
      setReporte(construir());
      setFormato('pdf');
      setError(null);
      setAbierto(true);
    } catch {
      setReporte(null);
      setError('No hay información suficiente para exportar esta vista.');
      setAbierto(true);
    }
  };

  const generar = async () => {
    if (!reporte) return;
    setGenerando(true);
    setError(null);
    try {
      const actual = construir();
      await exportarReporte(actual, formato);
      registrarExportacion(actual, formato);
      setAbierto(false);
    } catch (causa) {
      setError(
        causa instanceof Error
          ? `No se pudo generar el archivo: ${causa.message}`
          : 'No se pudo generar el archivo. Intenta nuevamente.',
      );
    } finally {
      setGenerando(false);
    }
  };

  return (
    <>
      <Button
        variante={variante}
        tamano={tamano}
        onClick={abrir}
        icono={<FileDown className="size-4" aria-hidden="true" />}
        className={className}
      >
        {etiqueta}
      </Button>

      <Modal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Exportar vista filtrada"
        descripcion="El archivo incluye los filtros, el alcance y los parámetros vigentes."
        ancho="lg"
        pie={
          <>
            <Button
              variante="ghost"
              onClick={() => setAbierto(false)}
              disabled={generando}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void generar()}
              cargando={generando}
              icono={
                formato === 'pdf' ? (
                  <FileText className="size-4" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                )
              }
            >
              Generar {formato === 'pdf' ? 'PDF' : 'Excel'}
            </Button>
          </>
        }
      >
        {reporte ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-line bg-soft p-4">
              <p className="text-sm font-semibold text-ink">{reporte.contexto.titulo}</p>
              <p className="mt-0.5 text-xs text-muted">{reporte.subtitulo}</p>
              <p className="mt-2 text-[11px] text-muted">
                {reporte.contexto.generadoPor} ·{' '}
                {formatearFechaHora(reporte.contexto.generadoEn)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Filtros activos
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {reporte.contexto.filtros.map((filtro) => (
                  <li
                    key={filtro.etiqueta}
                    className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-muted"
                  >
                    <span className="font-semibold text-ink">{filtro.etiqueta}:</span>{' '}
                    {filtro.valor}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Formato
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setFormato('pdf')}
                  aria-pressed={formato === 'pdf'}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                    formato === 'pdf'
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15'
                      : 'border-line bg-white hover:border-line-strong',
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-danger-soft text-danger">
                    <FileText className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">PDF</span>
                    <span className="block text-[11px] text-muted">
                      Resumen, detalle y alertas listos para imprimir.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormato('xlsx')}
                  aria-pressed={formato === 'xlsx'}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                    formato === 'xlsx'
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/15'
                      : 'border-line bg-white hover:border-line-strong',
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-success-soft text-success-strong">
                    <FileSpreadsheet className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">Excel</span>
                    <span className="block text-[11px] text-muted">
                      Hojas por sección, con celdas numéricas y autofiltro.
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Contenido
              </p>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {reporte.hojas.map((hoja) => (
                  <li
                    key={hoja.nombre}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <span className="text-xs font-medium text-ink">{hoja.nombre}</span>
                    <span className="text-[11px] text-muted">
                      {hoja.filas.length} filas
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              El archivo respeta el alcance de tu rol. El backend deberá repetir
              esta validación antes de entregar datos.
            </div>

            {error ? (
              <InlineAlert tono="danger" titulo="No se pudo exportar">
                {error}
              </InlineAlert>
            ) : null}
          </div>
        ) : (
          <InlineAlert tono="warning" titulo="Sin datos para exportar">
            {error ?? 'Ajusta los filtros e inténtalo nuevamente.'}
          </InlineAlert>
        )}
      </Modal>
    </>
  );
}
