import {
  calcularDesdeRegistros,
  clasificarDesviacion,
  horasCuadran,
  semaforoDeIndicadores,
} from '@/domain/calc';
import { SEMAFORO_CONFIG } from '@/domain/constants';
import {
  alertasDeDesviacion,
  filasConsolidado,
  filasPorProfesional,
  totalConsolidado,
} from '@/domain/selectors';
import type {
  Catalogo,
  Configuracion,
  ContextoReporte,
  Filtros,
  MetaMensual,
  PuntoSerie,
  Usuario,
} from '@/domain/types';
import {
  etiquetaPeriodo,
  formatearHoras,
  formatearNumero,
  formatearPct,
  formatearPctConSigno,
} from '@/lib/format';
import { resumenFiltros } from '@/lib/filters';
import type { ColumnaReporte, HojaReporte, Reporte, ResumenItem } from './types';
import { APP_SLUG } from '@/config/app';

interface DatosBase {
  usuario: Usuario;
  filtros: Filtros;
  catalogo: Catalogo;
  configuracion: Configuracion;
  metas: MetaMensual[];
  serie: PuntoSerie[];
}

function contexto(
  titulo: string,
  datos: Pick<DatosBase, 'usuario' | 'filtros' | 'catalogo' | 'configuracion'>,
): ContextoReporte {
  return {
    titulo,
    generadoPor: datos.usuario.nombre,
    rol: datos.usuario.rol,
    generadoEn: new Date().toISOString(),
    filtros: resumenFiltros(datos.filtros, datos.catalogo).map((filtro) => ({
      etiqueta: filtro.etiqueta,
      valor: filtro.valor,
    })),
    configuracion: datos.configuracion,
  };
}

function estadoTexto(desviacion: number, umbral: number, hayDatos: boolean): string {
  return SEMAFORO_CONFIG[
    clasificarDesviacion(desviacion, umbral, hayDatos)
  ].etiqueta;
}

const COLUMNAS_SERIE: ColumnaReporte[] = [
  { clave: 'periodo', titulo: 'Mes', tipo: 'texto', ancho: 16 },
  { clave: 'metaGestion', titulo: 'Meta gestión %', tipo: 'porcentaje', ancho: 16 },
  { clave: 'foja', titulo: '% FOJA', tipo: 'porcentaje', ancho: 12 },
  { clave: 'planificado', titulo: 'Planificado', tipo: 'entero', ancho: 14 },
  { clave: 'sic', titulo: 'SIC', tipo: 'entero', ancho: 12 },
  { clave: 'desviacion', titulo: 'Desviación %', tipo: 'porcentaje', ancho: 15 },
  { clave: 'estado', titulo: 'Semáforo', tipo: 'texto', ancho: 16 },
];

function filasSerie(serie: PuntoSerie[], umbral: number) {
  return serie.map((punto) => ({
    periodo: etiquetaPeriodo(punto.periodo),
    metaGestion: punto.indicadores.metaGestion,
    foja: punto.indicadores.foja,
    planificado: punto.indicadores.planificado,
    sic: punto.indicadores.sic,
    desviacion: punto.indicadores.desviacion,
    estado: estadoTexto(
      punto.indicadores.desviacion,
      umbral,
      punto.indicadores.planificado > 0,
    ),
  }));
}

const COLUMNAS_DETALLE: ColumnaReporte[] = [
  { clave: 'entidad', titulo: 'Entidad', tipo: 'texto', ancho: 34 },
  { clave: 'detalle', titulo: 'Detalle', tipo: 'texto', ancho: 28 },
  { clave: 'profesionales', titulo: 'Profesionales', tipo: 'entero', ancho: 13 },
  { clave: 'objetivo', titulo: 'Meta atenciones', tipo: 'entero', ancho: 15 },
  { clave: 'realizadas', titulo: 'Realizadas', tipo: 'entero', ancho: 13 },
  { clave: 'metaGestion', titulo: 'Meta gestión %', tipo: 'porcentaje', ancho: 14 },
  { clave: 'foja', titulo: '% FOJA', tipo: 'porcentaje', ancho: 11 },
  { clave: 'planificado', titulo: 'Planificado', tipo: 'entero', ancho: 13 },
  { clave: 'sic', titulo: 'SIC', tipo: 'entero', ancho: 11 },
  { clave: 'desviacion', titulo: 'Desviación %', tipo: 'porcentaje', ancho: 13 },
  { clave: 'estado', titulo: 'Semáforo', tipo: 'texto', ancho: 14 },
];

const COLUMNAS_PROFESIONAL: ColumnaReporte[] = [
  { clave: 'profesional', titulo: 'Profesional', tipo: 'texto', ancho: 30 },
  { clave: 'instituto', titulo: 'Instituto', tipo: 'texto', ancho: 24 },
  { clave: 'area', titulo: 'Área', tipo: 'texto', ancho: 24 },
  { clave: 'cargo', titulo: 'Cargo', tipo: 'texto', ancho: 18 },
  { clave: 'planificado', titulo: 'Planificado', tipo: 'entero', ancho: 13 },
  { clave: 'sic', titulo: 'SIC', tipo: 'entero', ancho: 11 },
  { clave: 'desviacion', titulo: 'Desviación %', tipo: 'porcentaje', ancho: 13 },
  { clave: 'umbral', titulo: 'Umbral %', tipo: 'porcentaje', ancho: 11 },
  { clave: 'estado', titulo: 'Semáforo', tipo: 'texto', ancho: 14 },
];

function resumenConsolidado(
  metas: MetaMensual[],
  configuracion: Configuracion,
): ResumenItem[] {
  const total = totalConsolidado(metas);
  const estado = semaforoDeIndicadores(total, configuracion);

  return [
    { etiqueta: 'Profesionales', valor: formatearNumero(total.profesionales) },
    { etiqueta: 'Meta atenciones', valor: formatearNumero(total.atencionesObjetivo) },
    { etiqueta: 'Atenciones realizadas', valor: formatearNumero(total.atencionesRealizadas) },
    { etiqueta: 'Meta de gestión', valor: formatearPct(total.metaGestion) },
    { etiqueta: 'Meta de gestión objetivo', valor: formatearPct(configuracion.metaGestionObjetivo) },
    { etiqueta: '% FOJA', valor: formatearPct(total.foja) },
    { etiqueta: 'Horas directas', valor: formatearHoras(total.horasDirectas) },
    { etiqueta: 'Horas indirectas', valor: formatearHoras(total.horasIndirectas) },
    { etiqueta: 'Horas NAS', valor: formatearHoras(total.horasNAS) },
    { etiqueta: 'Planificado', valor: formatearNumero(total.planificado) },
    { etiqueta: 'SIC', valor: formatearNumero(total.sic) },
    {
      etiqueta: 'Desviación SIC',
      valor: `${formatearPctConSigno(total.desviacion)} · ${SEMAFORO_CONFIG[estado].etiqueta}`,
    },
    { etiqueta: 'Umbral de desviación', valor: formatearPct(configuracion.umbralDesviacion) },
    {
      etiqueta: 'Conciliación de horas',
      valor: horasCuadran(total) ? 'Cuadra con el motor' : 'Revisar desglose',
    },
  ];
}

export function construirReporteConsolidado(
  datos: DatosBase & { titulo: string; nombreBase?: string },
): Reporte {
  const { metas, serie, filtros, catalogo, configuracion, titulo } = datos;
  const total = totalConsolidado(metas);
  const filas = filasConsolidado(metas, catalogo, filtros);
  const alertas = alertasDeDesviacion(metas, catalogo, configuracion);
  const umbral = configuracion.umbralDesviacion;

  const hojas: HojaReporte[] = [
    {
      nombre: 'Detalle',
      titulo: 'Detalle por entidad',
      descripcion: 'Totales recalculados sobre los registros del alcance filtrado.',
      columnas: COLUMNAS_DETALLE,
      filas: filas.map((fila) => ({
        entidad: fila.nombre,
        detalle: fila.sublabel,
        profesionales: fila.profesionales,
        objetivo: fila.indicadores.atencionesObjetivo,
        realizadas: fila.indicadores.atencionesRealizadas,
        metaGestion: fila.indicadores.metaGestion,
        foja: fila.indicadores.foja,
        planificado: fila.indicadores.planificado,
        sic: fila.indicadores.sic,
        desviacion: fila.indicadores.desviacion,
        estado: estadoTexto(
          fila.indicadores.desviacion,
          umbral,
          fila.indicadores.planificado > 0,
        ),
      })),
    },
    {
      nombre: 'Serie mensual',
      titulo: 'Evolución mensual',
      descripcion: 'Misma consulta, sin el filtro de mes.',
      columnas: COLUMNAS_SERIE,
      filas: filasSerie(serie, umbral),
    },
  ];

  if (alertas.length > 0) {
    hojas.push({
      nombre: 'Alertas',
      titulo: 'Profesionales sobre el umbral',
      descripcion: `Desviación absoluta mayor a ${formatearPct(umbral)}.`,
      columnas: COLUMNAS_PROFESIONAL,
      filas: alertas.map((alerta) => ({
        profesional: alerta.profesional.nombre,
        instituto: alerta.instituto?.nombre ?? '-',
        area: alerta.area?.nombre ?? '-',
        cargo: alerta.cargo,
        planificado: alerta.indicadores.planificado,
        sic: alerta.indicadores.sic,
        desviacion: alerta.indicadores.desviacion,
        umbral,
        estado: SEMAFORO_CONFIG[alerta.semaforo].etiqueta,
      })),
    });
  }

  return {
    contexto: contexto(titulo, datos),
    subtitulo: `${etiquetaPeriodo(filtros.mes)} · ${formatearNumero(total.profesionales)} profesionales en el alcance`,
    resumen: resumenConsolidado(metas, configuracion),
    hojas,
    nombreBase:
      datos.nombreBase ?? `${APP_SLUG}-consolidado-${filtros.mes}`,
  };
}

export function construirReporteMiMeta(
  datos: DatosBase & { titulo?: string },
): Reporte {
  const { metas, serie, filtros, catalogo, configuracion, usuario } = datos;
  const total = calcularDesdeRegistros(metas);
  const profesional = catalogo.profesionales.find(
    (item) => item.id === filtros.profesional,
  );
  const area = catalogo.areas.find((item) => item.id === profesional?.areaId);
  const instituto = catalogo.institutos.find(
    (item) => item.id === profesional?.institutoId,
  );
  const cargo = catalogo.cargos.find((item) => item.id === profesional?.cargoId);
  const umbral = configuracion.umbralDesviacion;
  const estado = semaforoDeIndicadores(total, configuracion);
  const titulo =
    datos.titulo ??
    `Meta del mes · ${profesional?.nombre ?? usuario.nombre}`;

  return {
    contexto: contexto(titulo, datos),
    subtitulo: `${etiquetaPeriodo(filtros.mes)} · ${instituto?.nombre ?? 'Sin instituto'} · ${area?.nombre ?? 'Sin área'}`,
    resumen: [
      { etiqueta: 'Profesional', valor: profesional?.nombre ?? usuario.nombre },
      { etiqueta: 'Cargo', valor: cargo?.nombre ?? usuario.cargo ?? '-' },
      { etiqueta: 'Meta de atenciones', valor: formatearNumero(total.atencionesObjetivo) },
      { etiqueta: 'Atenciones realizadas', valor: formatearNumero(total.atencionesRealizadas) },
      { etiqueta: 'Meta de gestión', valor: formatearPct(total.metaGestion) },
      { etiqueta: 'Meta de gestión objetivo', valor: formatearPct(configuracion.metaGestionObjetivo) },
      { etiqueta: '% FOJA', valor: formatearPct(total.foja) },
      { etiqueta: '% FOJA objetivo', valor: formatearPct(configuracion.fojaObjetivo) },
      { etiqueta: 'Horas contratadas', valor: formatearHoras(total.horasContratadas) },
      { etiqueta: 'Horas directas', valor: formatearHoras(total.horasDirectas) },
      { etiqueta: 'Horas indirectas', valor: formatearHoras(total.horasIndirectas) },
      { etiqueta: 'Horas NAS', valor: formatearHoras(total.horasNAS) },
      { etiqueta: 'Planificado', valor: formatearNumero(total.planificado) },
      { etiqueta: 'SIC', valor: formatearNumero(total.sic) },
      {
        etiqueta: 'Desviación SIC',
        valor: `${formatearPctConSigno(total.desviacion)} · ${SEMAFORO_CONFIG[estado].etiqueta}`,
      },
      { etiqueta: 'Umbral de desviación', valor: formatearPct(umbral) },
    ],
    hojas: [
      {
        nombre: 'Desglose de horas',
        titulo: 'Desglose de horas del mes',
        descripcion: 'Las horas directas, indirectas y NAS componen las horas contratadas.',
        columnas: [
          { clave: 'concepto', titulo: 'Concepto', tipo: 'texto', ancho: 26 },
          { clave: 'horas', titulo: 'Horas', tipo: 'horas', ancho: 14 },
          { clave: 'porcentaje', titulo: '% de contratadas', tipo: 'porcentaje', ancho: 18 },
        ],
        filas: [
          {
            concepto: 'Horas directas',
            horas: total.horasDirectas,
            porcentaje: total.horasContratadas
              ? (total.horasDirectas / total.horasContratadas) * 100
              : 0,
          },
          {
            concepto: 'Horas indirectas',
            horas: total.horasIndirectas,
            porcentaje: total.horasContratadas
              ? (total.horasIndirectas / total.horasContratadas) * 100
              : 0,
          },
          {
            concepto: 'Horas NAS (no asistencial)',
            horas: total.horasNAS,
            porcentaje: total.horasContratadas
              ? (total.horasNAS / total.horasContratadas) * 100
              : 0,
          },
          {
            concepto: 'Total horas contratadas',
            horas: total.horasContratadas,
            porcentaje: 100,
          },
        ],
      },
      {
        nombre: 'Serie mensual',
        titulo: 'Evolución mensual',
        columnas: COLUMNAS_SERIE,
        filas: filasSerie(serie, umbral),
      },
    ],
    nombreBase: `${APP_SLUG}-mi-meta-${filtros.mes}`,
  };
}

export function construirReportePlanificado(
  datos: DatosBase & { titulo?: string },
): Reporte {
  const { metas, serie, filtros, catalogo, configuracion, usuario } = datos;
  const total = totalConsolidado(metas);
  const alertas = alertasDeDesviacion(metas, catalogo, configuracion);
  const umbral = configuracion.umbralDesviacion;
  const estado = semaforoDeIndicadores(total, configuracion);
  const filas = filasPorProfesional(metas, catalogo, configuracion);
  const titulo = datos.titulo ?? 'Planificado vs SIC';

  return {
    contexto: contexto(titulo, datos),
    subtitulo: `${etiquetaPeriodo(filtros.mes)} · umbral ${formatearPct(umbral)} · ${SEMAFORO_CONFIG[estado].etiqueta}`,
    resumen: [
      { etiqueta: 'Planificado', valor: formatearNumero(total.planificado) },
      { etiqueta: 'SIC', valor: formatearNumero(total.sic) },
      { etiqueta: 'Diferencia', valor: formatearNumero(total.sic - total.planificado) },
      { etiqueta: 'Desviación', valor: formatearPctConSigno(total.desviacion) },
      { etiqueta: 'Umbral configurado', valor: formatearPct(umbral) },
      { etiqueta: 'Semáforo', valor: SEMAFORO_CONFIG[estado].etiqueta },
      { etiqueta: 'Profesionales en alerta', valor: formatearNumero(alertas.length) },
      { etiqueta: 'Profesionales', valor: formatearNumero(total.profesionales) },
      { etiqueta: 'Generado por', valor: usuario.nombre },
    ],
    hojas: [
      {
        nombre: 'Comparación mensual',
        titulo: 'Planificado vs SIC por mes',
        descripcion: 'La serie mantiene instituto, área, cargo y profesional; varía el mes.',
        columnas: COLUMNAS_SERIE,
        filas: filasSerie(serie, umbral),
      },
      {
        nombre: 'Detalle del mes',
        titulo: `Detalle por profesional · ${etiquetaPeriodo(filtros.mes)}`,
        descripcion: 'Registros del período filtrado y clasificación según el umbral vigente.',
        columnas: COLUMNAS_PROFESIONAL,
        filas: filas.map((fila) => ({
          profesional: fila.profesional.nombre,
          instituto: fila.instituto?.nombre ?? '-',
          area: fila.area?.nombre ?? '-',
          cargo: fila.cargo,
          planificado: fila.indicadores.planificado,
          sic: fila.indicadores.sic,
          desviacion: fila.indicadores.desviacion,
          umbral,
          estado: SEMAFORO_CONFIG[fila.semaforo].etiqueta,
        })),
      },
    ],
    nombreBase: `${APP_SLUG}-planificado-sic-${filtros.mes}`,
  };
}

export { estadoTexto };
