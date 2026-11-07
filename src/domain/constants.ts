import type { Configuracion, Periodo, Rol } from './types';
import { APP_SLUG } from '@/config/app';

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/** Períodos demo: enero a octubre de 2026. Octubre es el último mes cerrado. */
export const PERIODOS: Periodo[] = MESES.map((etiqueta, indice) => ({
  id: `2026-${String(indice + 1).padStart(2, '0')}`,
  anio: 2026,
  mes: indice + 1,
  etiqueta: `${etiqueta} de 2026`,
  corta: `${MESES_CORTOS[indice]} 2026`,
  cerrado: indice < 10,
})).slice(0, 10);

export const PERIODO_ACTUAL = PERIODOS[PERIODOS.length - 1]?.id ?? '2026-10';

export const CONFIGURACION_INICIAL: Configuracion = {
  metaGestionObjetivo: 90,
  fojaObjetivo: 90,
  umbralDesviacion: 10,
};

export const ETIQUETAS_ROL: Record<Rol, string> = {
  profesional: 'Profesional asistencial',
  jefatura_area: 'Jefatura de área',
  direccion_instituto: 'Dirección de instituto',
  direccion_nacional: 'Dirección nacional',
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  profesional: 'Acceso a su propia meta, horas y cumplimiento.',
  jefatura_area: 'Gestiona y exporta la información de su área.',
  direccion_instituto: 'Consolida todas las áreas de su instituto.',
  direccion_nacional: 'Visión nacional, parámetros y exportación global.',
};

export const FORMULAS = {
  metaGestion: 'Atenciones realizadas ÷ Atenciones objetivo × 100',
  foja: '(Horas directas + Horas indirectas) ÷ Horas contratadas × 100',
  desviacion: '(SIC − Planificado) ÷ Planificado × 100',
  horas: 'Horas contratadas = Horas directas + Horas indirectas + Horas NAS',
} as const;

export const SEMAFORO_CONFIG = {
  ok: {
    etiqueta: 'Dentro de rango',
    descripcion: 'La desviación está en la mitad inferior del umbral.',
  },
  atencion: {
    etiqueta: 'Atención',
    descripcion: 'Se acerca al umbral, pero aún no lo supera.',
  },
  alerta: {
    etiqueta: 'Alerta',
    descripcion: 'La desviación supera el umbral configurado.',
  },
  'sin-datos': {
    etiqueta: 'Sin datos',
    descripcion: 'No hay planificado para calcular la desviación.',
  },
} as const;

export const ALMACENAMIENTO = {
  sesion: `${APP_SLUG}.sesion`,
  configuracion: `${APP_SLUG}.configuracion`,
  historialExportaciones: `${APP_SLUG}.exportaciones`,
} as const;
