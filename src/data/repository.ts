import { calcularDesdeRegistros } from '@/domain/calc';
import type {
  Catalogo,
  Filtros,
  MetaMensual,
  PuntoSerie,
  Scope,
} from '@/domain/types';
import { filtrosToParams } from '@/lib/filters';
import { CATALOGO_SEED, METAS_SEED } from './seed';

/**
 * Contrato único de datos. Las páginas nunca conocen si el origen es mock u HTTP.
 * Al conectar el backend solo se reemplaza la implementación.
 */
export interface DataRepository {
  obtenerCatalogo(): Promise<Catalogo>;
  obtenerMetas(filtros: Filtros, scope: Scope): Promise<MetaMensual[]>;
  obtenerSerieMensual(filtros: Filtros, scope: Scope): Promise<PuntoSerie[]>;
}

const PROFESIONAL_POR_ID = new Map(
  CATALOGO_SEED.profesionales.map((profesional) => [profesional.id, profesional]),
);

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milisegundos);
  });
}

function coincide(
  meta: MetaMensual,
  filtros: Filtros,
  scope: Scope,
  ignorarPeriodo = false,
): boolean {
  const profesional = PROFESIONAL_POR_ID.get(meta.profesionalId);
  if (!profesional) return false;

  // El alcance manda sobre cualquier filtro manipulable desde la URL.
  if (scope.profesionalId && meta.profesionalId !== scope.profesionalId) return false;
  if (scope.areaId && profesional.areaId !== scope.areaId) return false;
  if (scope.institutoId && profesional.institutoId !== scope.institutoId) return false;

  if (!ignorarPeriodo && meta.periodo !== filtros.mes) return false;
  if (filtros.profesional && meta.profesionalId !== filtros.profesional) return false;
  if (filtros.area && profesional.areaId !== filtros.area) return false;
  if (filtros.instituto && profesional.institutoId !== filtros.instituto) return false;
  if (filtros.cargo && profesional.cargoId !== filtros.cargo) return false;

  return true;
}

/** Repositorio demo: datos deterministas, latencia simulada y filtrado local. */
export class MockRepository implements DataRepository {
  private readonly latenciaMs: number;

  constructor(latenciaMs = 140) {
    this.latenciaMs = latenciaMs;
  }

  async obtenerCatalogo(): Promise<Catalogo> {
    await esperar(Math.min(this.latenciaMs, 80));
    return {
      ...CATALOGO_SEED,
      periodos: [...CATALOGO_SEED.periodos],
      profesionales: [...CATALOGO_SEED.profesionales],
    };
  }

  async obtenerMetas(filtros: Filtros, scope: Scope): Promise<MetaMensual[]> {
    await esperar(this.latenciaMs);
    return METAS_SEED.filter((meta) => coincide(meta, filtros, scope)).map(
      (meta) => ({ ...meta }),
    );
  }

  async obtenerSerieMensual(
    filtros: Filtros,
    scope: Scope,
  ): Promise<PuntoSerie[]> {
    await esperar(this.latenciaMs);
    return CATALOGO_SEED.periodos.map((periodo) => ({
      periodo: periodo.id,
      indicadores: calcularDesdeRegistros(
        METAS_SEED.filter((meta) =>
          coincide(meta, { ...filtros, mes: periodo.id }, scope),
        ),
      ),
    }));
  }
}

/**
 * Esqueleto listo para el backend. El servidor debe derivar el alcance del
 * usuario desde la sesión/token; el cliente no envía `scope` como autoridad.
 */
export class HttpRepository implements DataRepository {
  private readonly baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  private async obtener<T>(ruta: string, params?: URLSearchParams): Promise<T> {
    const query = params?.toString();
    const respuesta = await fetch(
      `${this.baseUrl}${ruta}${query ? `?${query}` : ''}`,
      {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      },
    );

    if (!respuesta.ok) {
      throw new Error(
        `Error ${respuesta.status} al consultar ${ruta}. Intenta nuevamente.`,
      );
    }

    return (await respuesta.json()) as T;
  }

  obtenerCatalogo(): Promise<Catalogo> {
    return this.obtener<Catalogo>('/catalogos');
  }

  obtenerMetas(filtros: Filtros): Promise<MetaMensual[]> {
    return this.obtener<MetaMensual[]>('/metas', filtrosToParams(filtros));
  }

  obtenerSerieMensual(filtros: Filtros): Promise<PuntoSerie[]> {
    return this.obtener<PuntoSerie[]>('/series', filtrosToParams(filtros));
  }
}

const fuente = import.meta.env.VITE_REPOSITORIO ?? 'mock';

export const repositorio: DataRepository =
  fuente === 'http'
    ? new HttpRepository(import.meta.env.VITE_API_URL ?? '/api')
    : new MockRepository();
