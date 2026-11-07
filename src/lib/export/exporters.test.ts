// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularDesdeRegistros } from '@/domain/calc';
import { CONFIGURACION_INICIAL, PERIODO_ACTUAL } from '@/domain/constants';
import type { PuntoSerie } from '@/domain/types';
import { CATALOGO_SEED, METAS_SEED, USUARIOS_DEMO } from '@/data/seed';
import { construirReporteConsolidado } from './builders';
import { exportarExcel } from './excel';
import { exportarPdf } from './pdf';

const usuario = USUARIOS_DEMO.find(
  (item) => item.rol === 'direccion_nacional',
)!;
const metas = METAS_SEED.filter((meta) => meta.periodo === PERIODO_ACTUAL);
const serie: PuntoSerie[] = CATALOGO_SEED.periodos.map((periodo) => ({
  periodo: periodo.id,
  indicadores: calcularDesdeRegistros(
    METAS_SEED.filter((meta) => meta.periodo === periodo.id),
  ),
}));

const reporte = construirReporteConsolidado({
  usuario,
  filtros: { mes: PERIODO_ACTUAL },
  catalogo: CATALOGO_SEED,
  configuracion: CONFIGURACION_INICIAL,
  metas,
  serie,
  titulo: 'Reporte de exportación',
});

describe('exportadores PDF y Excel', () => {
  const blobs: Blob[] = [];
  const descargas: string[] = [];

  beforeEach(() => {
    blobs.length = 0;
    descargas.length = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return 'blob:mastervalidationsec-test';
      }),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function (this: HTMLAnchorElement) {
        descargas.push(this.download);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera un PDF no vacío con los filtros activos', async () => {
    await exportarPdf(reporte);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.size).toBeGreaterThan(1000);
    expect(descargas[0]).toMatch(/\.pdf$/);
  }, 60_000);

  it('genera un Excel no vacío con los filtros activos', async () => {
    await exportarExcel(reporte);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]?.size).toBeGreaterThan(1000);
    expect(descargas[0]).toMatch(/\.xlsx$/);
  }, 120_000);
});
