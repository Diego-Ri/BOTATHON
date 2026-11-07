import { describe, expect, it } from 'vitest';
import { horasCuadran } from '@/domain/calc';
import {
  CATALOGO_SEED,
  METAS_SEED,
  PROFESIONALES_SEED,
  USUARIOS_DEMO,
} from './seed';

describe('datos demo deterministas', () => {
  it('mantiene el tamaño del catálogo acordado', () => {
    expect(CATALOGO_SEED.institutos).toHaveLength(3);
    expect(CATALOGO_SEED.areas).toHaveLength(9);
    expect(CATALOGO_SEED.profesionales).toHaveLength(72);
    expect(CATALOGO_SEED.periodos).toHaveLength(10);
    expect(METAS_SEED).toHaveLength(720);
  });

  it('tiene un registro por profesional y mes', () => {
    const claves = new Set(METAS_SEED.map((meta) => `${meta.profesionalId}-${meta.periodo}`));
    expect(claves.size).toBe(METAS_SEED.length);
    expect(PROFESIONALES_SEED).toHaveLength(72);
  });

  it('todas las horas cuadran con la jornada contratada', () => {
    const descuadres = METAS_SEED.filter((meta) => !horasCuadran(meta, 0.11));
    expect(descuadres).toHaveLength(0);
  });

  it('genera metas, FOJA y desviaciones en rangos plausibles', () => {
    for (const meta of METAS_SEED) {
      const foja =
        ((meta.horasDirectas + meta.horasIndirectas) / meta.horasContratadas) * 100;
      expect(meta.atencionesObjetivo).toBeGreaterThan(0);
      expect(meta.atencionesRealizadas).toBeGreaterThan(0);
      expect(foja).toBeGreaterThanOrEqual(0);
      expect(foja).toBeLessThanOrEqual(100);
      expect(Math.abs((meta.sic - meta.planificado) / meta.planificado) * 100).toBeLessThan(50);
    }
  });

  it('incluye alertas en el mes activo para la demo', () => {
    const octubre = METAS_SEED.filter((meta) => meta.periodo === '2026-10');
    const alertas = octubre.filter((meta) => {
      const desviacion = ((meta.sic - meta.planificado) / meta.planificado) * 100;
      return Math.abs(desviacion) > 10;
    });
    expect(alertas.length).toBeGreaterThan(0);
  });

  it('los 5 usuarios demo cubren los 4 roles', () => {
    expect(USUARIOS_DEMO).toHaveLength(5);
    expect(new Set(USUARIOS_DEMO.map((usuario) => usuario.rol)).size).toBe(4);
    const profesional = USUARIOS_DEMO.find((usuario) => usuario.rol === 'profesional');
    expect(profesional?.profesionalId).toMatch(/^prof-/);
    expect(profesional?.cargoId).toBeTruthy();
  });
});
