import type { ContextoReporte } from '@/domain/types';

export type TipoColumna = 'texto' | 'entero' | 'decimal' | 'porcentaje' | 'horas';

export interface ColumnaReporte {
  clave: string;
  titulo: string;
  tipo: TipoColumna;
  ancho?: number;
  alineacion?: 'left' | 'right' | 'center';
}

export type ValorCelda = string | number | null;

export interface FilaReporte {
  [clave: string]: ValorCelda;
}

export interface HojaReporte {
  nombre: string;
  titulo: string;
  descripcion?: string;
  columnas: ColumnaReporte[];
  filas: FilaReporte[];
}

export interface ResumenItem {
  etiqueta: string;
  valor: string;
}

export interface Reporte {
  contexto: ContextoReporte;
  subtitulo: string;
  resumen: ResumenItem[];
  hojas: HojaReporte[];
  nombreBase: string;
}
