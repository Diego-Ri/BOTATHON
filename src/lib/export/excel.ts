import writeXlsxFile, {
  type Cell,
  type CellObject,
  type Sheet,
  type SheetData,
} from 'write-excel-file/browser';
import { fechaParaArchivo, nombreArchivo } from '@/lib/format';
import { descargarBlob } from './download';
import type { Reporte, TipoColumna, ValorCelda } from './types';
import { APP_NAME } from '@/config/app';

const FORMATOS: Record<TipoColumna, string | undefined> = {
  texto: undefined,
  entero: '#,##0',
  decimal: '#,##0.0',
  porcentaje: '0.0"%"',
  horas: '#,##0.0" h"',
};

const COLOR = {
  navy: '#111111',
  brand: '#C80511',
  brandSuave: '#FFF1F2',
  ink: '#111111',
  muted: '#5F5F5F',
  linea: '#E6E6E6',
  zebra: '#FAFAFA',
  success: '#087A53',
  warning: '#8D5D0C',
  danger: '#7A121B',
} as const;

function nombreHoja(nombre: string): string {
  return nombre.replace(/[[\]:*?/\\]/g, '-').slice(0, 31);
}

function colorEstado(estado: unknown): string | undefined {
  if (typeof estado !== 'string') return undefined;
  if (estado === 'Alerta') return COLOR.danger;
  if (estado === 'Atención') return COLOR.warning;
  if (estado === 'Dentro de rango') return COLOR.success;
  return undefined;
}

function vacios(cantidad: number): null[] {
  return Array.from({ length: Math.max(0, cantidad) }, () => null);
}

function texto(valor: string, opciones: Partial<CellObject> = {}): CellObject {
  return { value: valor, ...opciones };
}

function numero(
  valor: ValorCelda,
  tipo: TipoColumna,
  opciones: Partial<CellObject> = {},
): Cell {
  if (valor === null || valor === undefined || valor === '') return texto('-');
  const numeroValor = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numeroValor)) return texto(String(valor));

  return {
    value: numeroValor,
    type: Number,
    format: FORMATOS[tipo],
    align: 'right',
    ...opciones,
  };
}

function tituloHoja(titulo: string, columnas: number): SheetData[number] {
  return [
    texto(titulo, {
      columnSpan: columnas,
      fontWeight: 'bold',
      fontSize: 16,
      textColor: '#FFFFFF',
      backgroundColor: COLOR.navy,
      height: 32,
      alignVertical: 'center',
      indent: 1,
    }),
    ...vacios(columnas - 1),
  ];
}

function construirResumen(reporte: Reporte): SheetData {
  const filas: SheetData = [
    tituloHoja(reporte.contexto.titulo, 4),
    [
      texto(reporte.subtitulo, {
        columnSpan: 4,
        fontSize: 10,
        textColor: COLOR.muted,
        height: 22,
        alignVertical: 'center',
        indent: 1,
      }),
      null,
      null,
      null,
    ],
    [
      texto(
        `Generado por ${reporte.contexto.generadoPor} · ${new Date(
          reporte.contexto.generadoEn,
        ).toLocaleString('es-CL')}`,
        {
          columnSpan: 4,
          fontSize: 9,
          textColor: COLOR.muted,
          alignVertical: 'center',
          indent: 1,
        },
      ),
      null,
      null,
      null,
    ],
    [],
    [
      texto('Filtros activos', {
        columnSpan: 4,
        fontWeight: 'bold',
        fontSize: 10,
        textColor: COLOR.brand,
        backgroundColor: COLOR.brandSuave,
        height: 22,
        alignVertical: 'center',
        indent: 1,
      }),
      null,
      null,
      null,
    ],
  ];

  for (const filtro of reporte.contexto.filtros) {
    filas.push([
      texto(filtro.etiqueta, { fontWeight: 'bold', fontSize: 9 }),
      texto(filtro.valor, { fontSize: 9 }),
      null,
      null,
    ]);
  }

  filas.push([]);
  filas.push([
    texto('Resumen ejecutivo', {
      columnSpan: 4,
      fontWeight: 'bold',
      fontSize: 10,
      textColor: '#FFFFFF',
      backgroundColor: COLOR.brand,
      height: 22,
      alignVertical: 'center',
      indent: 1,
    }),
    null,
    null,
    null,
  ]);
  filas.push([
    texto('Indicador', {
      fontWeight: 'bold',
      fontSize: 9,
      textColor: COLOR.muted,
      backgroundColor: '#F5F5F5',
      height: 20,
    }),
    texto('Valor', {
      fontWeight: 'bold',
      fontSize: 9,
      textColor: COLOR.muted,
      backgroundColor: '#F5F5F5',
    }),
    texto('Indicador', {
      fontWeight: 'bold',
      fontSize: 9,
      textColor: COLOR.muted,
      backgroundColor: '#F5F5F5',
    }),
    texto('Valor', {
      fontWeight: 'bold',
      fontSize: 9,
      textColor: COLOR.muted,
      backgroundColor: '#F5F5F5',
    }),
  ]);

  for (let indice = 0; indice < reporte.resumen.length; indice += 2) {
    const primero = reporte.resumen[indice];
    const segundo = reporte.resumen[indice + 1];
    filas.push([
      texto(primero?.etiqueta ?? '', { fontWeight: 'bold', fontSize: 9 }),
      texto(primero?.valor ?? '', { fontSize: 9 }),
      texto(segundo?.etiqueta ?? '', { fontWeight: 'bold', fontSize: 9 }),
      texto(segundo?.valor ?? '', { fontSize: 9 }),
    ]);
  }

  return filas;
}

function construirHojaDetalle(
  reporte: Reporte,
  indiceHoja: number,
): SheetData {
  const hoja = reporte.hojas[indiceHoja];
  if (!hoja) return [];
  const cantidadColumnas = hoja.columnas.length;
  const filas: SheetData = [
    tituloHoja(hoja.titulo, cantidadColumnas),
    [
      texto(hoja.descripcion ?? '', {
        columnSpan: cantidadColumnas,
        fontSize: 9,
        textColor: COLOR.muted,
        height: 20,
        alignVertical: 'center',
        indent: 1,
      }),
      ...vacios(cantidadColumnas - 1),
    ],
    [
      texto(
        `${APP_NAME} · ${reporte.contexto.titulo} · ${new Date(
          reporte.contexto.generadoEn,
        ).toLocaleString('es-CL')}`,
        {
          columnSpan: cantidadColumnas,
          fontSize: 8,
          textColor: '#8C8C8C',
          height: 18,
          alignVertical: 'center',
          indent: 1,
        },
      ),
      ...vacios(cantidadColumnas - 1),
    ],
    [],
    hoja.columnas.map((columna) =>
      texto(columna.titulo, {
        fontWeight: 'bold',
        fontSize: 9,
        textColor: '#FFFFFF',
        backgroundColor: COLOR.brand,
        align: columna.tipo === 'texto' ? 'left' : 'right',
        alignVertical: 'center',
        wrap: true,
        height: 28,
      }),
    ),
  ];

  hoja.filas.forEach((filaReporte, indiceFila) => {
    const fondo = indiceFila % 2 === 0 ? COLOR.zebra : undefined;
    filas.push(
      hoja.columnas.map((columna, indiceColumna) => {
        const valor = filaReporte[columna.clave] ?? null;
        const esEstado = columna.clave === 'estado';
        const color = esEstado ? colorEstado(valor) : undefined;
        const alineacion =
          columna.alineacion ??
          (columna.tipo === 'texto' ? ('left' as const) : ('right' as const));

        if (columna.tipo === 'texto') {
          return texto(String(valor ?? '-'), {
            fontSize: 9,
            fontWeight:
              indiceColumna === 0 || esEstado ? 'bold' : undefined,
            textColor: color ?? COLOR.ink,
            align: alineacion,
            wrap: true,
            backgroundColor: fondo,
            bottomBorderColor: COLOR.linea,
            bottomBorderStyle: 'thin',
          });
        }

        return numero(valor, columna.tipo, {
          fontSize: 9,
          textColor: color ?? COLOR.ink,
          align: alineacion,
          backgroundColor: fondo,
          bottomBorderColor: COLOR.linea,
          bottomBorderStyle: 'thin',
        });
      }),
    );
  });

  return filas;
}

export async function exportarExcel(reporte: Reporte): Promise<void> {
  const hojas: Sheet<Blob>[] = [
    {
      data: construirResumen(reporte),
      sheet: 'Resumen',
      columns: [{ width: 30 }, { width: 46 }, { width: 30 }, { width: 46 }],
      showGridLines: false,
    },
    ...reporte.hojas.map((hoja, indice) => ({
      data: construirHojaDetalle(reporte, indice),
      sheet: nombreHoja(hoja.nombre),
      columns: hoja.columnas.map((columna) => ({
        width: columna.ancho ?? 16,
      })),
      stickyRowsCount: 5,
      showGridLines: false,
    })),
  ];

  const blob = await writeXlsxFile(hojas, {
    fontFamily: 'Calibri',
    fontSize: 10,
  }).toBlob();

  descargarBlob(
    blob,
    nombreArchivo([reporte.nombreBase, fechaParaArchivo()], 'xlsx'),
  );
}
