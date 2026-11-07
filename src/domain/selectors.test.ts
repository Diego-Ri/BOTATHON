import { describe, expect, it } from 'vitest';
import { PERIODO_ACTUAL } from '@/domain/constants';
import {
  alertasDeDesviacion,
  filasConsolidado,
  filasPorProfesional,
  nivelConsolidado,
  totalConsolidado,
} from './selectors';
import { CATALOGO_SEED, METAS_SEED } from '@/data/seed';

const configuracion = {
  metaGestionObjetivo: 90,
  fojaObjetivo: 90,
  umbralDesviacion: 10,
};

const metasOctubre = METAS_SEED.filter((meta) => meta.periodo === PERIODO_ACTUAL);

const suma = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);

describe('selectores de consolidado', () => {
  it('determina el nivel según los filtros', () => {
    expect(nivelConsolidado({ mes: PERIODO_ACTUAL })).toBe('instituto');
    expect(
      nivelConsolidado({ mes: PERIODO_ACTUAL, instituto: 'inst-inr' }),
    ).toBe('area');
    expect(
      nivelConsolidado({ mes: PERIODO_ACTUAL, instituto: 'inst-inr', area: 'area-inr-fisica' }),
    ).toBe('profesional');
  });

  it('los totales nacionales coinciden con la suma de filas', () => {
    const total = totalConsolidado(metasOctubre);
    const filas = filasConsolidado(metasOctubre, CATALOGO_SEED, {
      mes: PERIODO_ACTUAL,
    });

    expect(filas).toHaveLength(3);
    expect(suma(filas.map((fila) => fila.indicadores.atencionesObjetivo))).toBe(
      total.atencionesObjetivo,
    );
    expect(suma(filas.map((fila) => fila.indicadores.atencionesRealizadas))).toBe(
      total.atencionesRealizadas,
    );
    expect(suma(filas.map((fila) => fila.indicadores.planificado))).toBe(
      total.planificado,
    );
    expect(suma(filas.map((fila) => fila.indicadores.sic))).toBe(total.sic);
  });

  it('el total de un instituto coincide con la suma de sus áreas', () => {
    const metasInstituto = metasOctubre.filter((meta) =>
      CATALOGO_SEED.profesionales
        .find((profesional) => profesional.id === meta.profesionalId)
        ?.institutoId === 'inst-inr',
    );
    const total = totalConsolidado(metasInstituto);
    const filas = filasConsolidado(metasInstituto, CATALOGO_SEED, {
      mes: PERIODO_ACTUAL,
      instituto: 'inst-inr',
    });

    expect(filas).toHaveLength(3);
    expect(suma(filas.map((fila) => fila.indicadores.atencionesObjetivo))).toBe(
      total.atencionesObjetivo,
    );
    expect(suma(filas.map((fila) => fila.indicadores.sic))).toBe(total.sic);
  });

  it('el total de un área coincide con la suma de sus profesionales', () => {
    const metasArea = metasOctubre.filter((meta) =>
      CATALOGO_SEED.profesionales
        .find((profesional) => profesional.id === meta.profesionalId)
        ?.areaId === 'area-inr-fisica',
    );
    const total = totalConsolidado(metasArea);
    const filas = filasConsolidado(metasArea, CATALOGO_SEED, {
      mes: PERIODO_ACTUAL,
      instituto: 'inst-inr',
      area: 'area-inr-fisica',
    });

    expect(filas).toHaveLength(8);
    expect(suma(filas.map((fila) => fila.indicadores.atencionesRealizadas))).toBe(
      total.atencionesRealizadas,
    );
  });

  it('las alertas superan estrictamente el umbral', () => {
    const alertas = alertasDeDesviacion(metasOctubre, CATALOGO_SEED, configuracion);
    expect(alertas.length).toBeGreaterThan(0);
    for (const alerta of alertas) {
      expect(alerta.semaforo).toBe('alerta');
      expect(Math.abs(alerta.indicadores.desviacion)).toBeGreaterThan(
        configuracion.umbralDesviacion,
      );
    }
  });

  it('las filas por profesional conservan los totales', () => {
    const filas = filasPorProfesional(metasOctubre, CATALOGO_SEED, configuracion);
    const total = totalConsolidado(metasOctubre);
    expect(filas).toHaveLength(72);
    expect(suma(filas.map((fila) => fila.indicadores.atencionesObjetivo))).toBe(
      total.atencionesObjetivo,
    );
  });
});
