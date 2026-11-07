import { PERIODOS, PERIODO_ACTUAL } from '@/domain/constants';
import type { Catalogo, Filtros, Scope } from '@/domain/types';

export function filtrosIniciales(mes = PERIODO_ACTUAL): Filtros {
  return { mes };
}

function texto(value: string | null): string | undefined {
  const limpio = value?.trim();
  return limpio ? limpio : undefined;
}

/** Lee filtros desde la URL. La validación de IDs se hace al normalizar con el catálogo. */
export function parseFiltros(params: URLSearchParams): Filtros {
  const mes = texto(params.get('mes'));
  return {
    instituto: texto(params.get('instituto')),
    area: texto(params.get('area')),
    cargo: texto(params.get('cargo')),
    mes: mes && PERIODOS.some((periodo) => periodo.id === mes) ? mes : PERIODO_ACTUAL,
    profesional: texto(params.get('profesional')),
  };
}

export function filtrosToParams(filtros: Filtros): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.instituto) params.set('instituto', filtros.instituto);
  if (filtros.area) params.set('area', filtros.area);
  if (filtros.cargo) params.set('cargo', filtros.cargo);
  params.set('mes', filtros.mes);
  if (filtros.profesional) params.set('profesional', filtros.profesional);
  return params;
}

export function filtrosToQuery(filtros: Filtros): string {
  return filtrosToParams(filtros).toString();
}

export function mismosFiltros(a: Filtros, b: Filtros): boolean {
  return (
    a.instituto === b.instituto &&
    a.area === b.area &&
    a.cargo === b.cargo &&
    a.mes === b.mes &&
    a.profesional === b.profesional
  );
}

/**
 * Resuelve la jerarquía: el filtro más específico manda.
 * profesional > área > instituto. Evita combinaciones imposibles en la URL.
 */
export function normalizarJerarquia(
  filtros: Filtros,
  catalogo: Catalogo,
): Filtros {
  const resultado: Filtros = { ...filtros };

  if (
    resultado.instituto &&
    !catalogo.institutos.some((instituto) => instituto.id === resultado.instituto)
  ) {
    delete resultado.instituto;
  }

  if (
    resultado.area &&
    !catalogo.areas.some((area) => area.id === resultado.area)
  ) {
    delete resultado.area;
  }

  if (
    resultado.cargo &&
    !catalogo.cargos.some((cargo) => cargo.id === resultado.cargo)
  ) {
    delete resultado.cargo;
  }

  if (resultado.profesional) {
    const profesional = catalogo.profesionales.find(
      (item) => item.id === resultado.profesional,
    );
    if (profesional) {
      resultado.instituto = profesional.institutoId;
      resultado.area = profesional.areaId;
      if (resultado.cargo && resultado.cargo !== profesional.cargoId) {
        delete resultado.cargo;
      }
    } else {
      delete resultado.profesional;
    }
  }

  if (resultado.area) {
    const area = catalogo.areas.find((item) => item.id === resultado.area);
    if (area) {
      resultado.instituto = area.institutoId;
      if (
        resultado.profesional &&
        !catalogo.profesionales.some(
          (profesional) =>
            profesional.id === resultado.profesional &&
            profesional.areaId === area.id,
        )
      ) {
        delete resultado.profesional;
      }
    }
  }

  if (!PERIODOS.some((periodo) => periodo.id === resultado.mes)) {
    resultado.mes = PERIODO_ACTUAL;
  }

  return resultado;
}

/**
 * Fuerza el alcance del rol. El backend debe repetir esta validación:
 * ocultar un filtro en la UI no es un control de seguridad.
 */
export function aplicarAlcance(filtros: Filtros, scope: Scope): Filtros {
  const resultado: Filtros = { ...filtros };

  if (scope.institutoId) {
    if (resultado.instituto && resultado.instituto !== scope.institutoId) {
      delete resultado.area;
      delete resultado.profesional;
    }
    resultado.instituto = scope.institutoId;
  }

  if (scope.areaId) {
    if (resultado.area && resultado.area !== scope.areaId) {
      delete resultado.profesional;
    }
    resultado.area = scope.areaId;
  }

  if (scope.profesionalId) {
    resultado.profesional = scope.profesionalId;
  }

  if (scope.cargoId) {
    resultado.cargo = scope.cargoId;
  }

  return resultado;
}

/** Normaliza catálogo + jerarquía + alcance, en ese orden. */
export function sanearFiltros(
  filtros: Filtros,
  catalogo: Catalogo,
  scope: Scope,
): Filtros {
  return normalizarJerarquia(
    aplicarAlcance(normalizarJerarquia(filtros, catalogo), scope),
    catalogo,
  );
}

export function filtrosPorDefecto(scope: Scope, mes = PERIODO_ACTUAL): Filtros {
  const filtros: Filtros = {
    mes: PERIODOS.some((periodo) => periodo.id === mes) ? mes : PERIODO_ACTUAL,
  };
  if (scope.institutoId) filtros.instituto = scope.institutoId;
  if (scope.areaId) filtros.area = scope.areaId;
  if (scope.profesionalId) filtros.profesional = scope.profesionalId;
  return filtros;
}

export interface ResumenFiltro {
  clave: keyof Filtros;
  etiqueta: string;
  valor: string;
  activo: boolean;
}

/** Resumen legible para chips y para la cabecera de los archivos exportados. */
export function resumenFiltros(
  filtros: Filtros,
  catalogo: Catalogo,
): ResumenFiltro[] {
  const instituto = catalogo.institutos.find((item) => item.id === filtros.instituto);
  const area = catalogo.areas.find((item) => item.id === filtros.area);
  const cargo = catalogo.cargos.find((item) => item.id === filtros.cargo);
  const profesional = catalogo.profesionales.find(
    (item) => item.id === filtros.profesional,
  );
  const periodo = catalogo.periodos.find((item) => item.id === filtros.mes);

  return [
    {
      clave: 'instituto',
      etiqueta: 'Instituto',
      valor: instituto?.nombre ?? 'Todos los institutos',
      activo: Boolean(instituto),
    },
    {
      clave: 'area',
      etiqueta: 'Área',
      valor: area?.nombre ?? 'Todas las áreas',
      activo: Boolean(area),
    },
    {
      clave: 'cargo',
      etiqueta: 'Cargo',
      valor: cargo?.nombre ?? 'Todos los cargos',
      activo: Boolean(cargo),
    },
    {
      clave: 'mes',
      etiqueta: 'Mes',
      valor: periodo?.etiqueta ?? filtros.mes,
      activo: true,
    },
    {
      clave: 'profesional',
      etiqueta: 'Profesional',
      valor: profesional?.nombre ?? 'Todos los profesionales',
      activo: Boolean(profesional),
    },
  ];
}
