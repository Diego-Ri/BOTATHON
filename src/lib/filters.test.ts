import { describe, expect, it } from 'vitest';
import { PERIODOS, PERIODO_ACTUAL } from '@/domain/constants';
import type { Catalogo, Scope } from '@/domain/types';
import {
  aplicarAlcance,
  filtrosPorDefecto,
  filtrosToParams,
  normalizarJerarquia,
  parseFiltros,
  sanearFiltros,
} from './filters';

const catalogo: Catalogo = {
  institutos: [
    { id: 'i1', nombre: 'Instituto Uno', sigla: 'I1' },
    { id: 'i2', nombre: 'Instituto Dos', sigla: 'I2' },
  ],
  areas: [
    { id: 'a1', institutoId: 'i1', nombre: 'Área Uno' },
    { id: 'a2', institutoId: 'i2', nombre: 'Área Dos' },
  ],
  cargos: [
    { id: 'kine', nombre: 'Kinesiología' },
    { id: 'enfermeria', nombre: 'Enfermería' },
  ],
  profesionales: [
    {
      id: 'p1',
      nombre: 'Profesional Uno',
      cargoId: 'kine',
      areaId: 'a1',
      institutoId: 'i1',
      horasContratadas: 176,
      activo: true,
    },
    {
      id: 'p2',
      nombre: 'Profesional Dos',
      cargoId: 'enfermeria',
      areaId: 'a2',
      institutoId: 'i2',
      horasContratadas: 176,
      activo: true,
    },
  ],
  periodos: PERIODOS,
  periodoActual: PERIODO_ACTUAL,
};

describe('filtros de URL y jerarquía', () => {
  it('parsea y serializa sin perder el mes', () => {
    const params = new URLSearchParams(
      'instituto=i1&area=a1&cargo=kine&mes=2026-02&profesional=p1',
    );
    const filtros = parseFiltros(params);
    expect(filtros).toEqual({
      instituto: 'i1',
      area: 'a1',
      cargo: 'kine',
      mes: '2026-02',
      profesional: 'p1',
    });
    expect(filtrosToParams(filtros).toString()).toContain('mes=2026-02');
  });

  it('usa el período actual si el mes es inválido', () => {
    expect(parseFiltros(new URLSearchParams('mes=2099-01')).mes).toBe(PERIODO_ACTUAL);
  });

  it('hace que el filtro más específico mande en la jerarquía', () => {
    const resultado = normalizarJerarquia(
      { instituto: 'i1', area: 'a2', mes: PERIODO_ACTUAL },
      catalogo,
    );
    expect(resultado.instituto).toBe('i2');
    expect(resultado.area).toBe('a2');
  });

  it('al elegir profesional ajusta área, instituto y limpia cargo incompatible', () => {
    const resultado = normalizarJerarquia(
      {
        instituto: 'i1',
        area: 'a1',
        cargo: 'kine',
        profesional: 'p2',
        mes: PERIODO_ACTUAL,
      },
      catalogo,
    );
    expect(resultado.instituto).toBe('i2');
    expect(resultado.area).toBe('a2');
    expect(resultado.profesional).toBe('p2');
    expect(resultado.cargo).toBeUndefined();
  });

  it('el alcance del rol pisa filtros manipulados desde la URL', () => {
    const scope: Scope = {
      rol: 'direccion_instituto',
      institutoId: 'i1',
    };
    const saneado = sanearFiltros(
      { instituto: 'i2', area: 'a2', profesional: 'p2', mes: PERIODO_ACTUAL },
      catalogo,
      scope,
    );
    expect(saneado.instituto).toBe('i1');
    expect(saneado.area).toBeUndefined();
    expect(saneado.profesional).toBeUndefined();
  });

  it('una jefatura no puede ver profesionales de otra área', () => {
    const scope: Scope = {
      rol: 'jefatura_area',
      institutoId: 'i1',
      areaId: 'a1',
    };
    const saneado = sanearFiltros(
      { instituto: 'i2', area: 'a2', profesional: 'p2', mes: PERIODO_ACTUAL },
      catalogo,
      scope,
    );
    expect(saneado.instituto).toBe('i1');
    expect(saneado.area).toBe('a1');
    expect(saneado.profesional).toBeUndefined();
  });

  it('un profesional queda fijado a su ficha y su cargo', () => {
    const scope: Scope = {
      rol: 'profesional',
      institutoId: 'i1',
      areaId: 'a1',
      profesionalId: 'p1',
      cargoId: 'kine',
    };
    const saneado = sanearFiltros(
      { instituto: 'i2', area: 'a2', cargo: 'enfermeria', mes: PERIODO_ACTUAL },
      catalogo,
      scope,
    );
    expect(saneado.profesional).toBe('p1');
    expect(saneado.area).toBe('a1');
    expect(saneado.instituto).toBe('i1');
    expect(saneado.cargo).toBe('kine');
  });

  it('aplicarAlcance no deja áreas fuera del instituto permitido', () => {
    const resultado = aplicarAlcance(
      { instituto: 'i2', area: 'a2', profesional: 'p2', mes: PERIODO_ACTUAL },
      { rol: 'direccion_instituto', institutoId: 'i1' },
    );
    expect(resultado.instituto).toBe('i1');
    expect(resultado.area).toBeUndefined();
    expect(resultado.profesional).toBeUndefined();
  });

  it('los filtros por defecto respetan el alcance y el mes', () => {
    const filtros = filtrosPorDefecto(
      {
        rol: 'jefatura_area',
        institutoId: 'i1',
        areaId: 'a1',
      },
      '2026-03',
    );
    expect(filtros).toEqual({
      mes: '2026-03',
      instituto: 'i1',
      area: 'a1',
    });
  });
});
