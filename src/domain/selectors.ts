import {
  calcularDesdeRegistros,
  clasificarDesviacion,
  redondear,
} from './calc';
import type {
  Area,
  Catalogo,
  Configuracion,
  Filtros,
  Indicadores,
  Instituto,
  MetaMensual,
  Profesional,
  Semaforo,
} from './types';

export type NivelTabla = 'instituto' | 'area' | 'profesional';

/** El nivel de la tabla se deriva de qué tan específicos son los filtros. */
export function nivelConsolidado(filtros: Filtros): NivelTabla {
  if (filtros.area || filtros.profesional) return 'profesional';
  if (filtros.instituto) return 'area';
  return 'instituto';
}

export interface FilaConsolidada {
  id: string;
  nombre: string;
  sublabel: string;
  nivel: NivelTabla;
  indicadores: Indicadores;
  profesionales: number;
}

interface Grupo {
  id: string;
  nombre: string;
  sublabel: string;
  metas: MetaMensual[];
}

function agrupar(
  metas: MetaMensual[],
  obtenerGrupo: (meta: MetaMensual) => { id: string; nombre: string; sublabel: string } | null,
): Grupo[] {
  const grupos = new Map<string, Grupo>();

  for (const meta of metas) {
    const info = obtenerGrupo(meta);
    if (!info) continue;
    const existente = grupos.get(info.id);
    if (existente) {
      existente.metas.push(meta);
    } else {
      grupos.set(info.id, { ...info, metas: [meta] });
    }
  }

  return [...grupos.values()];
}

export function filasConsolidado(
  metas: MetaMensual[],
  catalogo: Catalogo,
  filtros: Filtros,
): FilaConsolidada[] {
  const nivel = nivelConsolidado(filtros);
  const profesionales = new Map(
    catalogo.profesionales.map((profesional) => [profesional.id, profesional]),
  );
  const areas = new Map(catalogo.areas.map((area) => [area.id, area]));
  const institutos = new Map(
    catalogo.institutos.map((instituto) => [instituto.id, instituto]),
  );
  const cargos = new Map(catalogo.cargos.map((cargo) => [cargo.id, cargo]));

  const grupos = agrupar(metas, (meta) => {
    const profesional = profesionales.get(meta.profesionalId);
    if (!profesional) return null;
    const area = areas.get(profesional.areaId);
    const instituto = institutos.get(profesional.institutoId);

    if (nivel === 'profesional') {
      return {
        id: profesional.id,
        nombre: profesional.nombre,
        sublabel: `${area?.nombre ?? 'Sin área'} · ${cargos.get(profesional.cargoId)?.nombre ?? 'Sin cargo'}`,
      };
    }

    if (nivel === 'area') {
      return {
        id: profesional.areaId,
        nombre: area?.nombre ?? 'Sin área',
        sublabel: instituto?.sigla ?? 'Sin instituto',
      };
    }

    return {
      id: profesional.institutoId,
      nombre: instituto?.nombre ?? 'Sin instituto',
      sublabel: instituto?.sigla ?? '',
    };
  });

  return grupos
    .map((grupo) => ({
      id: grupo.id,
      nombre: grupo.nombre,
      sublabel: grupo.sublabel,
      nivel,
      indicadores: calcularDesdeRegistros(grupo.metas),
      profesionales: new Set(grupo.metas.map((meta) => meta.profesionalId)).size,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function totalConsolidado(metas: MetaMensual[]): Indicadores {
  return calcularDesdeRegistros(metas);
}

export function nivelDesdeFila(nivel: NivelTabla): NivelTabla {
  return nivel;
}

export interface AlertaDesviacion {
  profesional: Profesional;
  instituto?: Instituto;
  area?: Area;
  cargo: string;
  indicadores: Indicadores;
  semaforo: Semaforo;
}

export function alertasDeDesviacion(
  metas: MetaMensual[],
  catalogo: Catalogo,
  configuracion: Configuracion,
): AlertaDesviacion[] {
  const profesionales = new Map(
    catalogo.profesionales.map((profesional) => [profesional.id, profesional]),
  );
  const areas = new Map(catalogo.areas.map((area) => [area.id, area]));
  const institutos = new Map(
    catalogo.institutos.map((instituto) => [instituto.id, instituto]),
  );
  const cargos = new Map(catalogo.cargos.map((cargo) => [cargo.id, cargo]));

  return metas
    .flatMap((meta) => {
      const profesional = profesionales.get(meta.profesionalId);
      if (!profesional) return [];
      const indicadores = calcularDesdeRegistros([meta]);
      const semaforo = clasificarDesviacion(
        indicadores.desviacion,
        configuracion.umbralDesviacion,
        indicadores.planificado > 0,
      );
      if (semaforo !== 'alerta') return [];

      return [
        {
          profesional,
          instituto: institutos.get(profesional.institutoId),
          area: areas.get(profesional.areaId),
          cargo: cargos.get(profesional.cargoId)?.nombre ?? 'Sin cargo',
          indicadores,
          semaforo,
        },
      ];
    })
    .sort(
      (a, b) =>
        Math.abs(b.indicadores.desviacion) - Math.abs(a.indicadores.desviacion),
    );
}

export interface FilaProfesional {
  profesional: Profesional;
  instituto?: Instituto;
  area?: Area;
  cargo: string;
  indicadores: Indicadores;
  semaforo: Semaforo;
}

export function filasPorProfesional(
  metas: MetaMensual[],
  catalogo: Catalogo,
  configuracion: Configuracion,
): FilaProfesional[] {
  const profesionales = new Map(
    catalogo.profesionales.map((profesional) => [profesional.id, profesional]),
  );
  const areas = new Map(catalogo.areas.map((area) => [area.id, area]));
  const institutos = new Map(
    catalogo.institutos.map((instituto) => [instituto.id, instituto]),
  );
  const cargos = new Map(catalogo.cargos.map((cargo) => [cargo.id, cargo]));

  const grupos = new Map<string, MetaMensual[]>();
  for (const meta of metas) {
    const actuales = grupos.get(meta.profesionalId);
    if (actuales) actuales.push(meta);
    else grupos.set(meta.profesionalId, [meta]);
  }

  return [...grupos.entries()]
    .flatMap(([profesionalId, registros]) => {
      const profesional = profesionales.get(profesionalId);
      if (!profesional) return [];
      const indicadores = calcularDesdeRegistros(registros);
      return [
        {
          profesional,
          instituto: institutos.get(profesional.institutoId),
          area: areas.get(profesional.areaId),
          cargo: cargos.get(profesional.cargoId)?.nombre ?? 'Sin cargo',
          indicadores,
          semaforo: clasificarDesviacion(
            indicadores.desviacion,
            configuracion.umbralDesviacion,
            indicadores.planificado > 0,
          ),
        },
      ];
    })
    .sort((a, b) => a.profesional.nombre.localeCompare(b.profesional.nombre, 'es'));
}

export function brechaDesviacionAbsoluta(indicadores: Indicadores): number {
  return redondear(Math.abs(indicadores.desviacion), 1);
}
