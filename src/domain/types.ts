/**
 * Tipos de dominio compartidos entre la UI, el motor de cálculo y la capa de datos.
 * Cuando se conecte el backend, estos tipos deben reflejar el contrato de la API.
 */

export type Rol =
  | 'profesional'
  | 'jefatura_area'
  | 'direccion_instituto'
  | 'direccion_nacional';

export type NivelConsolidado = 'nacional' | 'instituto' | 'area' | 'profesional';

export type Semaforo = 'ok' | 'atencion' | 'alerta' | 'sin-datos';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  cargo?: string;
  cargoId?: string;
  institutoId?: string;
  areaId?: string;
  profesionalId?: string;
  iniciales: string;
  descripcion: string;
}

export interface Instituto {
  id: string;
  nombre: string;
  sigla: string;
}

export interface Area {
  id: string;
  institutoId: string;
  nombre: string;
}

export interface Cargo {
  id: string;
  nombre: string;
}

export interface Profesional {
  id: string;
  nombre: string;
  cargoId: string;
  areaId: string;
  institutoId: string;
  horasContratadas: number;
  activo: boolean;
}

export interface Periodo {
  id: string;
  anio: number;
  mes: number;
  etiqueta: string;
  corta: string;
  cerrado: boolean;
}

/** Filtros que viven en la URL. `mes` siempre tiene valor. */
export interface Filtros {
  instituto?: string;
  area?: string;
  cargo?: string;
  mes: string;
  profesional?: string;
}

/** Alcance efectivo del usuario. Nunca se debe confiar solo en la UI: el backend lo revalida. */
export interface Scope {
  rol: Rol;
  institutoId?: string;
  areaId?: string;
  profesionalId?: string;
  /** Solo se usa para bloquear el filtro de cargo en la UI. */
  cargoId?: string;
}

/** Registro crudo mensual por profesional. Es la fuente de todos los indicadores. */
export interface MetaMensual {
  id: string;
  profesionalId: string;
  periodo: string;
  atencionesObjetivo: number;
  atencionesRealizadas: number;
  horasDirectas: number;
  horasIndirectas: number;
  horasNAS: number;
  horasContratadas: number;
  planificado: number;
  sic: number;
}

/** Suma de registros crudos. Nunca se promedian porcentajes: se recalcula sobre los totales. */
export interface TotalesMeta {
  profesionales: number;
  atencionesObjetivo: number;
  atencionesRealizadas: number;
  horasDirectas: number;
  horasIndirectas: number;
  horasNAS: number;
  horasContratadas: number;
  planificado: number;
  sic: number;
}

export interface Indicadores extends TotalesMeta {
  /** Atenciones realizadas / atenciones objetivo × 100 */
  metaGestion: number;
  /** (Horas directas + horas indirectas) / horas contratadas × 100 */
  foja: number;
  /** (SIC − Planificado) / Planificado × 100 */
  desviacion: number;
  horasAsistenciales: number;
}

export interface PuntoSerie {
  periodo: string;
  indicadores: Indicadores;
}

export interface Configuracion {
  metaGestionObjetivo: number;
  fojaObjetivo: number;
  umbralDesviacion: number;
}

export interface Catalogo {
  institutos: Instituto[];
  areas: Area[];
  cargos: Cargo[];
  profesionales: Profesional[];
  periodos: Periodo[];
  periodoActual: string;
}

export interface OpcionFiltro {
  value: string;
  label: string;
  hint?: string;
}

/** Alcance de un reporte exportado. Se guarda junto al archivo para trazabilidad. */
export interface ContextoReporte {
  titulo: string;
  generadoPor: string;
  rol: Rol;
  generadoEn: string;
  filtros: Array<{ etiqueta: string; valor: string }>;
  configuracion: Configuracion;
}
