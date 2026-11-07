import { ALMACENAMIENTO } from '@/domain/constants';
import type { Reporte } from './types';
import { APP_SLUG } from '@/config/app';

export type FormatoExportacion = 'pdf' | 'xlsx';

export interface ExportacionHistorial {
  id: string;
  fecha: string;
  formato: FormatoExportacion;
  titulo: string;
  filtros: string;
  usuario: string;
  archivo: string;
}

function clave(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function leerHistorial(): ExportacionHistorial[] {
  try {
    const crudo = localStorage.getItem(ALMACENAMIENTO.historialExportaciones);
    if (!crudo) return [];
    const datos: unknown = JSON.parse(crudo);
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (item): item is ExportacionHistorial =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        'titulo' in item &&
        'fecha' in item,
    );
  } catch {
    return [];
  }
}

export function registrarExportacion(
  reporte: Reporte,
  formato: FormatoExportacion,
): void {
  const entrada: ExportacionHistorial = {
    id: clave(),
    fecha: new Date().toISOString(),
    formato,
    titulo: reporte.contexto.titulo,
    filtros: reporte.contexto.filtros
      .map((filtro) => `${filtro.etiqueta}: ${filtro.valor}`)
      .join(' · '),
    usuario: reporte.contexto.generadoPor,
    archivo: `${reporte.nombreBase}.${formato}`,
  };

  try {
    const historial = [entrada, ...leerHistorial()].slice(0, 8);
    localStorage.setItem(
      ALMACENAMIENTO.historialExportaciones,
      JSON.stringify(historial),
    );
    window.dispatchEvent(new Event(`${APP_SLUG}:exportacion`));
  } catch {
    // El historial es una comodidad, no debe bloquear la descarga.
  }
}
