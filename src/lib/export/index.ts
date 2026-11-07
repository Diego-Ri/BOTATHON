import type { Reporte } from './types';
import type { FormatoExportacion } from './history';

/** Carga bajo demanda: jsPDF y ExcelJS no entran al bundle inicial. */
export async function exportarReporte(
  reporte: Reporte,
  formato: FormatoExportacion,
): Promise<void> {
  if (formato === 'pdf') {
    const { exportarPdf } = await import('./pdf');
    await exportarPdf(reporte);
    return;
  }

  const { exportarExcel } = await import('./excel');
  await exportarExcel(reporte);
}
