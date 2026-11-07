import {
  ArrowLeftRight,
  Building2,
  FileDown,
  Gauge,
  Home,
  Settings2,
  Target,
  type LucideIcon,
} from 'lucide-react';
import type { VistaId } from '@/domain/permissions';
import type { Rol } from '@/domain/types';

export interface ItemNavegacion {
  id: VistaId;
  ruta: string;
  nombre: string;
  descripcion: string;
  icono: LucideIcon;
  grupo: 'Panel' | 'Análisis' | 'Gestión';
}

export const NAVEGACION: ItemNavegacion[] = [
  {
    id: 'inicio',
    ruta: '/',
    nombre: 'Inicio',
    descripcion: 'Resumen del período',
    icono: Home,
    grupo: 'Panel',
  },
  {
    id: 'mi-meta',
    ruta: '/mi-meta',
    nombre: 'Mi meta del mes',
    descripcion: 'Meta y desglose de horas',
    icono: Target,
    grupo: 'Panel',
  },
  {
    id: 'kpis',
    ruta: '/kpis',
    nombre: 'KPIs de gestión',
    descripcion: 'Meta de gestión y FOJA',
    icono: Gauge,
    grupo: 'Panel',
  },
  {
    id: 'consolidado',
    ruta: '/consolidado',
    nombre: 'Consolidado',
    descripcion: 'Nacional, instituto, área y profesional',
    icono: Building2,
    grupo: 'Análisis',
  },
  {
    id: 'planificado',
    ruta: '/planificado',
    nombre: 'Planificado vs SIC',
    descripcion: 'Desviación y semáforo',
    icono: ArrowLeftRight,
    grupo: 'Análisis',
  },
  {
    id: 'reportes',
    ruta: '/reportes',
    nombre: 'Reportes',
    descripcion: 'Exportar vista filtrada',
    icono: FileDown,
    grupo: 'Gestión',
  },
  {
    id: 'configuracion',
    ruta: '/configuracion',
    nombre: 'Configuración',
    descripcion: 'Umbrales y parámetros',
    icono: Settings2,
    grupo: 'Gestión',
  },
];

export function nombreNavegacion(item: ItemNavegacion, rol?: Rol): string {
  if (item.id === 'mi-meta' && rol !== 'profesional') {
    return 'Meta por profesional';
  }
  if (item.id === 'consolidado' && rol === 'direccion_instituto') {
    return 'Consolidado del instituto';
  }
  if (item.id === 'consolidado' && rol === 'jefatura_area') {
    return 'Consolidado del área';
  }
  return item.nombre;
}
