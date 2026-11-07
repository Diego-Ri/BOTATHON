import {
  fechaParaArchivo,
  formatearDecimal,
  formatearHoras,
  formatearNumero,
  formatearPct,
  nombreArchivo,
} from '@/lib/format';
import { descargarBlob } from './download';
import type { Reporte, TipoColumna, ValorCelda } from './types';
import { APP_NAME } from '@/config/app';

/** Los PDF estándar de jsPDF usan Latin-1: reemplazamos símbolos fuera de ese rango. */
function normalizarPdf(texto: string): string {
  return texto
    .replace(/→/g, '->')
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function textoCelda(valor: ValorCelda, tipo: TipoColumna): string {
  if (valor === null || valor === undefined || valor === '') return '-';
  const numero = typeof valor === 'number' ? valor : Number(valor);

  switch (tipo) {
    case 'porcentaje':
      return Number.isFinite(numero) ? formatearPct(numero) : String(valor);
    case 'horas':
      return Number.isFinite(numero) ? formatearHoras(numero) : String(valor);
    case 'entero':
      return Number.isFinite(numero) ? formatearNumero(numero) : String(valor);
    case 'decimal':
      return Number.isFinite(numero) ? formatearDecimal(numero) : String(valor);
    case 'texto':
    default:
      return String(valor);
  }
}

export async function exportarPdf(reporte: Reporte): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margen = 14;
  const anchoUtil = anchoPagina - margen * 2;

  // Cabecera institucional.
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, anchoPagina, 27, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(APP_NAME, margen, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Panel de metas asistenciales y gestión', margen, 18);
  doc.setFontSize(7.5);
  doc.text(
    normalizarPdf(
      `Generado: ${new Date(reporte.contexto.generadoEn).toLocaleString('es-CL')}`,
    ),
    anchoPagina - margen,
    11,
    { align: 'right' },
  );
  doc.text(
    normalizarPdf(`Por: ${reporte.contexto.generadoPor}`),
    anchoPagina - margen,
    16,
    { align: 'right' },
  );
  doc.text(
    normalizarPdf(`Filtros: ${reporte.contexto.filtros.length} activos`),
    anchoPagina - margen,
    21,
    { align: 'right' },
  );

  let y = 36;
  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(normalizarPdf(reporte.contexto.titulo), margen, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(95, 95, 95);
  const lineasSubtitulo = doc.splitTextToSize(
    normalizarPdf(reporte.subtitulo),
    anchoUtil,
  );
  doc.text(lineasSubtitulo, margen, y);
  y += lineasSubtitulo.length * 4 + 2;

  const textoFiltros = reporte.contexto.filtros
    .map((filtro) => `${filtro.etiqueta}: ${filtro.valor}`)
    .join('  ·  ');
  const lineasFiltros = doc.splitTextToSize(
    normalizarPdf(textoFiltros),
    anchoUtil,
  );
  doc.setFontSize(7.5);
  doc.text(lineasFiltros, margen, y);
  y += lineasFiltros.length * 3.6 + 4;

  const filasResumen: string[][] = [];
  for (let indice = 0; indice < reporte.resumen.length; indice += 2) {
    const primer = reporte.resumen[indice];
    const segundo = reporte.resumen[indice + 1];
    filasResumen.push([
      normalizarPdf(primer?.etiqueta ?? ''),
      normalizarPdf(primer?.valor ?? ''),
      normalizarPdf(segundo?.etiqueta ?? ''),
      normalizarPdf(segundo?.valor ?? ''),
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor', 'Indicador', 'Valor']],
    body: filasResumen,
    margin: { left: margen, right: margen },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
      cellPadding: 1.7,
      lineColor: [227, 227, 227],
      lineWidth: 0.15,
      textColor: [17, 17, 17],
    },
    headStyles: {
      fillColor: [200, 5, 17],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 58 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { cellWidth: 58 },
    },
  });

  // Una página por hoja para mantener tablas legibles.
  for (const hoja of reporte.hojas) {
    doc.addPage();
    let yHoja = 22;

    doc.setTextColor(17, 17, 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(normalizarPdf(hoja.titulo), margen, yHoja);
    yHoja += 5;

    if (hoja.descripcion) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(95, 95, 95);
      const lineas = doc.splitTextToSize(
        normalizarPdf(hoja.descripcion),
        anchoUtil,
      );
      doc.text(lineas, margen, yHoja);
      yHoja += lineas.length * 3.6 + 2;
    }

    if (hoja.filas.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(95, 95, 95);
      doc.text(
        'Sin registros para los filtros activos.',
        margen,
        yHoja + 4,
      );
      continue;
    }

    const columnas = hoja.columnas;
    const columnStyles: Record<
      number,
      { halign?: 'left' | 'right' | 'center'; cellWidth?: number }
    > = Object.fromEntries(
      columnas.map((columna, indice) => [
        indice,
        {
          halign:
            columna.alineacion ??
            (columna.tipo === 'texto' ? 'left' : 'right'),
          cellWidth: columna.ancho,
        },
      ]),
    );

    autoTable(doc, {
      startY: yHoja,
      head: [columnas.map((columna) => normalizarPdf(columna.titulo))],
      body: hoja.filas.map((fila) =>
        columnas.map((columna) =>
          normalizarPdf(textoCelda(fila[columna.clave] ?? null, columna.tipo)),
        ),
      ),
      margin: { left: margen, right: margen },
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 7.2,
        cellPadding: 1.5,
        lineColor: [230, 230, 230],
        lineWidth: 0.1,
        textColor: [17, 17, 17],
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [17, 17, 17],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.2,
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles,
    });
  }

  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(
      normalizarPdf(
        `${APP_NAME} · ${reporte.contexto.titulo} · Documento generado automáticamente`,
      ),
      margen,
      altoPagina - 7,
    );
    doc.text(
      `Página ${pagina} de ${totalPaginas}`,
      anchoPagina - margen,
      altoPagina - 7,
      { align: 'right' },
    );
  }

  descargarBlob(
    doc.output('blob'),
    nombreArchivo([reporte.nombreBase, fechaParaArchivo()], 'pdf'),
  );
}
