import { describe, expect, it } from 'vitest';
import { calcularDesdeRegistros } from '@/domain/calc';
import { CONFIGURACION_INICIAL, PERIODO_ACTUAL } from '@/domain/constants';
import type { MetaMensual, PuntoSerie } from '@/domain/types';
import { CATALOGO_SEED, METAS_SEED, USUARIOS_DEMO } from '@/data/seed';
import {
  construirReporteConsolidado,
  construirReporteMiMeta,
  construirReportePlanificado,
} from './builders';

const usuarioNacional = USUARIOS_DEMO.find(
  (usuario) => usuario.rol === 'direccion_nacional',
)!;
const usuarioProfesional = USUARIOS_DEMO.find(
  (usuario) => usuario.rol === 'profesional',
)!;

const metasOctubre = METAS_SEED.filter((meta) => meta.periodo === PERIODO_ACTUAL);
const serieNacional: PuntoSerie[] = CATALOGO_SEED.periodos.map((periodo) => ({
  periodo: periodo.id,
  indicadores: calcularDesdeRegistros(
    METAS_SEED.filter((meta) => meta.periodo === periodo.id),
  ),
}));

const filtrosNacional = { mes: PERIODO_ACTUAL };
const filtrosProfesional = {
  mes: PERIODO_ACTUAL,
  instituto: usuarioProfesional.institutoId,
  area: usuarioProfesional.areaId,
  cargo: usuarioProfesional.cargoId,
  profesional: usuarioProfesional.profesionalId,
};

function metasDelProfesional(): MetaMensual[] {
  return METAS_SEED.filter(
    (meta) =>
      meta.profesionalId === usuarioProfesional.profesionalId &&
      meta.periodo === PERIODO_ACTUAL,
  );
}

const serieProfesional: PuntoSerie[] = CATALOGO_SEED.periodos.map((periodo) => ({
  periodo: periodo.id,
  indicadores: calcularDesdeRegistros(
    METAS_SEED.filter(
      (meta) =>
        meta.profesionalId === usuarioProfesional.profesionalId &&
        meta.periodo === periodo.id,
    ),
  ),
}));

describe('constructores de reportes', () => {
  it('exporta los filtros activos y el detalle consolidado', () => {
    const reporte = construirReporteConsolidado({
      usuario: usuarioNacional,
      filtros: filtrosNacional,
      catalogo: CATALOGO_SEED,
      configuracion: CONFIGURACION_INICIAL,
      metas: metasOctubre,
      serie: serieNacional,
      titulo: 'Reporte de prueba',
    });

    expect(reporte.contexto.filtros).toHaveLength(5);
    expect(reporte.contexto.filtros[0]?.valor).toBe('Todos los institutos');
    expect(reporte.contexto.generadoPor).toBe(usuarioNacional.nombre);
    expect(reporte.contexto.configuracion.umbralDesviacion).toBe(10);
    expect(reporte.hojas.map((hoja) => hoja.nombre)).toContain('Detalle');
    expect(reporte.hojas.map((hoja) => hoja.nombre)).toContain('Serie mensual');
    const detalle = reporte.hojas.find((hoja) => hoja.nombre === 'Detalle');
    expect(detalle?.filas).toHaveLength(3);
    expect(reporte.resumen.some((item) => item.etiqueta === 'Meta de gestión')).toBe(true);
  });

  it('respeta el filtro de instituto en el detalle', () => {
    const metasInstituto = metasOctubre.filter(
      (meta) =>
        CATALOGO_SEED.profesionales.find(
          (profesional) => profesional.id === meta.profesionalId,
        )?.institutoId === 'inst-inr',
    );
    const reporte = construirReporteConsolidado({
      usuario: usuarioNacional,
      filtros: { mes: PERIODO_ACTUAL, instituto: 'inst-inr' },
      catalogo: CATALOGO_SEED,
      configuracion: CONFIGURACION_INICIAL,
      metas: metasInstituto,
      serie: serieNacional,
      titulo: 'Consolidado INR',
    });

    const detalle = reporte.hojas.find((hoja) => hoja.nombre === 'Detalle');
    expect(detalle?.filas).toHaveLength(3);
    expect(reporte.contexto.filtros.find((filtro) => filtro.etiqueta === 'Instituto')?.valor)
      .toContain('Rehabilitación');
  });

  it('genera el desglose de horas de una ficha profesional', () => {
    const reporte = construirReporteMiMeta({
      usuario: usuarioProfesional,
      filtros: filtrosProfesional,
      catalogo: CATALOGO_SEED,
      configuracion: CONFIGURACION_INICIAL,
      metas: metasDelProfesional(),
      serie: serieProfesional,
    });

    const desglose = reporte.hojas.find((hoja) => hoja.nombre === 'Desglose de horas');
    expect(desglose?.filas).toHaveLength(4);
    expect(desglose?.filas[3]?.porcentaje).toBe(100);
    expect(reporte.contexto.filtros.find((filtro) => filtro.etiqueta === 'Profesional')?.valor)
      .toBe(usuarioProfesional.nombre);
    expect(reporte.subtitulo).toContain('2026');
  });

  it('incluye comparación mensual y detalle en el reporte planificado', () => {
    const reporte = construirReportePlanificado({
      usuario: usuarioNacional,
      filtros: filtrosNacional,
      catalogo: CATALOGO_SEED,
      configuracion: CONFIGURACION_INICIAL,
      metas: metasOctubre,
      serie: serieNacional,
    });

    expect(reporte.hojas.map((hoja) => hoja.nombre)).toEqual([
      'Comparación mensual',
      'Detalle del mes',
    ]);
    expect(reporte.hojas[0]?.filas).toHaveLength(10);
    expect(reporte.hojas[1]?.filas).toHaveLength(72);
    expect(reporte.resumen.some((item) => item.etiqueta === 'Umbral configurado')).toBe(true);
  });
});
