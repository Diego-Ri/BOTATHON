import { describe, expect, it } from 'vitest';
import {
  agregarMetas,
  calcularDesdeRegistros,
  calcularIndicadores,
  clasificarDesviacion,
  horasCuadran,
  porcentaje,
  redondear,
  semaforoDeIndicadores,
} from './calc';
import type { MetaMensual } from './types';

function meta(parcial: Partial<MetaMensual> = {}): MetaMensual {
  return {
    id: 'm1',
    profesionalId: 'p1',
    periodo: '2026-10',
    atencionesObjetivo: 100,
    atencionesRealizadas: 100,
    horasDirectas: 100,
    horasIndirectas: 20,
    horasNAS: 10,
    horasContratadas: 130,
    planificado: 100,
    sic: 100,
    ...parcial,
  };
}

describe('motor de cálculo', () => {
  it('agrega registros y cuenta profesionales únicos', () => {
    const total = agregarMetas([
      meta({ id: '1', profesionalId: 'p1' }),
      meta({ id: '2', profesionalId: 'p1' }),
      meta({ id: '3', profesionalId: 'p2', atencionesObjetivo: 200 }),
    ]);

    expect(total.profesionales).toBe(2);
    expect(total.atencionesObjetivo).toBe(400);
    expect(total.atencionesRealizadas).toBe(300);
    expect(total.planificado).toBe(300);
  });

  it('recalcula porcentajes sobre totales y no promedia porcentajes', () => {
    const indicadores = calcularDesdeRegistros([
      meta({ profesionalId: 'p1', atencionesObjetivo: 100, atencionesRealizadas: 100 }),
      meta({ profesionalId: 'p2', atencionesObjetivo: 200, atencionesRealizadas: 100 }),
    ]);

    // 200 / 300 = 66,7% (el promedio simple de 100% y 50% sería 75%).
    expect(indicadores.metaGestion).toBe(66.7);
  });

  it('calcula FOJA y desviación con las fórmulas publicadas', () => {
    const indicadores = calcularIndicadores({
      profesionales: 1,
      atencionesObjetivo: 100,
      atencionesRealizadas: 90,
      horasDirectas: 80,
      horasIndirectas: 20,
      horasNAS: 10,
      horasContratadas: 110,
      planificado: 200,
      sic: 230,
    });

    expect(indicadores.horasAsistenciales).toBe(100);
    expect(indicadores.foja).toBe(90.9);
    expect(indicadores.desviacion).toBe(15);
    expect(indicadores.metaGestion).toBe(90);
  });

  it('evita divisiones por cero', () => {
    expect(porcentaje(10, 0)).toBe(0);
    expect(
      calcularIndicadores({
        profesionales: 0,
        atencionesObjetivo: 0,
        atencionesRealizadas: 0,
        horasDirectas: 0,
        horasIndirectas: 0,
        horasNAS: 0,
        horasContratadas: 0,
        planificado: 0,
        sic: 0,
      }).metaGestion,
    ).toBe(0);
  });

  it('clasifica el semáforo con el umbral y sus límites', () => {
    expect(clasificarDesviacion(0, 10)).toBe('ok');
    expect(clasificarDesviacion(5, 10)).toBe('ok');
    expect(clasificarDesviacion(5.1, 10)).toBe('atencion');
    expect(clasificarDesviacion(-10, 10)).toBe('atencion');
    expect(clasificarDesviacion(10.1, 10)).toBe('alerta');
    expect(clasificarDesviacion(-25, 10)).toBe('alerta');
    expect(clasificarDesviacion(0, 10, false)).toBe('sin-datos');
  });

  it('marca alerta solo cuando la desviación supera el umbral', () => {
    const configuracion = {
      metaGestionObjetivo: 90,
      fojaObjetivo: 90,
      umbralDesviacion: 10,
    };
    const indicadores = calcularDesdeRegistros([
      meta({ planificado: 100, sic: 113 }),
    ]);

    expect(semaforoDeIndicadores(indicadores, configuracion)).toBe('alerta');
  });

  it('valida que el desglose de horas cuadre con las contratadas', () => {
    expect(horasCuadran(meta())).toBe(true);
    expect(
      horasCuadran(meta({ horasNAS: 9, horasContratadas: 130 })),
    ).toBe(false);
  });

  it('redondea de forma estable a un decimal', () => {
    expect(redondear(89.95, 1)).toBe(90);
    expect(redondear(1.04, 1)).toBe(1);
  });
});
