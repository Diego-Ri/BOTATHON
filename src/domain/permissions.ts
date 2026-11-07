import type { Rol } from './types';

export type VistaId =
  | 'inicio'
  | 'mi-meta'
  | 'kpis'
  | 'consolidado'
  | 'planificado'
  | 'reportes'
  | 'configuracion';

export const ROLES: Rol[] = [
  'profesional',
  'jefatura_area',
  'direccion_instituto',
  'direccion_nacional',
];

/** Matriz de acceso a vistas. La navegación y las rutas usan esta única fuente. */
export const ACCESO_VISTAS: Record<VistaId, Rol[]> = {
  inicio: ROLES,
  'mi-meta': ROLES,
  kpis: ROLES,
  consolidado: ['jefatura_area', 'direccion_instituto', 'direccion_nacional'],
  planificado: ROLES,
  reportes: ['jefatura_area', 'direccion_instituto', 'direccion_nacional'],
  configuracion: ['direccion_nacional'],
};

export function puedeVerVista(rol: Rol | undefined, vista: VistaId): boolean {
  return Boolean(rol && ACCESO_VISTAS[vista].includes(rol));
}

export function puedeExportar(rol: Rol | undefined): boolean {
  return Boolean(rol && rol !== 'profesional');
}

export function puedeAjustarUmbral(rol: Rol | undefined): boolean {
  return rol === 'direccion_nacional';
}

export function puedeVerConsolidado(rol: Rol | undefined): boolean {
  return Boolean(rol && rol !== 'profesional');
}
