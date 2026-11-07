import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCatalogo } from '@/data/queries';
import { alcanceDeUsuario } from '@/domain/scope';
import type {
  Area,
  Catalogo,
  Filtros,
  Instituto,
  OpcionFiltro,
  Periodo,
  Profesional,
  Scope,
} from '@/domain/types';
import {
  filtrosPorDefecto,
  filtrosToParams,
  normalizarJerarquia,
  parseFiltros,
  resumenFiltros,
  sanearFiltros,
  type ResumenFiltro,
} from '@/lib/filters';
import { useUsuarioActual } from '@/store/auth';
import { ErrorState, PageLoader } from '@/components/ui/Feedback';

type ClaveFiltro = keyof Filtros;
type FiltrosBloqueados = Partial<Record<ClaveFiltro, boolean>>;

interface OpcionesFiltros {
  institutos: Instituto[];
  areas: Area[];
  cargos: OpcionFiltro[];
  profesionales: Profesional[];
  periodos: Periodo[];
}

interface FiltersContextValue {
  filtros: Filtros;
  catalogo: Catalogo;
  scope: Scope;
  opciones: OpcionesFiltros;
  bloqueados: FiltrosBloqueados;
  resumen: ResumenFiltro[];
  etiquetaAlcance: string;
  setFiltro: (clave: ClaveFiltro, valor: string | undefined) => void;
  irA: (cambios: Partial<Filtros>) => void;
  limpiar: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

function etiquetaDeAlcance(
  scope: Scope,
  catalogo: Catalogo,
  usuarioNombre?: string,
): string {
  if (scope.profesionalId) {
    const profesional = catalogo.profesionales.find(
      (item) => item.id === scope.profesionalId,
    );
    return `Ficha de ${usuarioNombre ?? profesional?.nombre ?? 'profesional'}`;
  }
  if (scope.areaId) {
    const instituto = catalogo.institutos.find(
      (item) => item.id === scope.institutoId,
    );
    const area = catalogo.areas.find((item) => item.id === scope.areaId);
    return [instituto?.sigla, area?.nombre].filter(Boolean).join(' · ');
  }
  if (scope.institutoId) {
    const instituto = catalogo.institutos.find(
      (item) => item.id === scope.institutoId,
    );
    return instituto?.nombre ?? 'Instituto';
  }
  return 'Cobertura nacional';
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const usuario = useUsuarioActual();
  const catalogoQuery = useCatalogo();
  const [searchParams, setSearchParams] = useSearchParams();

  const scope = useMemo(
    () => (usuario ? alcanceDeUsuario(usuario) : { rol: 'profesional' as const }),
    [usuario],
  );

  const filtrosUrl = useMemo(() => parseFiltros(searchParams), [searchParams]);

  const efectivos = useMemo(() => {
    if (!catalogoQuery.data) return filtrosUrl;
    return sanearFiltros(filtrosUrl, catalogoQuery.data, scope);
  }, [filtrosUrl, catalogoQuery.data, scope]);

  useEffect(() => {
    const consulta = filtrosToParams(efectivos).toString();
    if (consulta !== searchParams.toString()) {
      setSearchParams(consulta, { replace: true });
    }
  }, [efectivos, searchParams, setSearchParams]);

  const irA = useCallback(
    (cambios: Partial<Filtros>) => {
      if (!catalogoQuery.data) return;

      const siguiente: Filtros = { ...efectivos };
      for (const clave of Object.keys(cambios) as Array<keyof Filtros>) {
        const valor = cambios[clave];
        if (valor === undefined) {
          delete siguiente[clave];
        } else {
          siguiente[clave] = valor;
        }
      }

      if ('instituto' in cambios && cambios.instituto !== efectivos.instituto) {
        delete siguiente.area;
        delete siguiente.profesional;
      }

      if ('area' in cambios && cambios.area !== efectivos.area) {
        delete siguiente.profesional;
      }

      if ('cargo' in cambios) {
        const profesional = catalogoQuery.data.profesionales.find(
          (item) => item.id === siguiente.profesional,
        );
        if (profesional && profesional.cargoId !== cambios.cargo) {
          delete siguiente.profesional;
        }
      }

      const saneado = sanearFiltros(siguiente, catalogoQuery.data, scope);
      setSearchParams(filtrosToParams(saneado));
    },
    [catalogoQuery.data, efectivos, scope, setSearchParams],
  );

  const setFiltro = useCallback(
    (clave: ClaveFiltro, valor: string | undefined) => {
      irA({ [clave]: valor } as Partial<Filtros>);
    },
    [irA],
  );

  const limpiar = useCallback(() => {
    if (!catalogoQuery.data) return;
    const porDefecto = filtrosPorDefecto(scope, efectivos.mes);
    setSearchParams(
      filtrosToParams(normalizarJerarquia(porDefecto, catalogoQuery.data)),
    );
  }, [catalogoQuery.data, efectivos.mes, scope, setSearchParams]);

  const opciones = useMemo<OpcionesFiltros>(() => {
    if (!catalogoQuery.data) {
      return { institutos: [], areas: [], cargos: [], profesionales: [], periodos: [] };
    }

    const { institutos, areas, cargos, profesionales, periodos } = catalogoQuery.data;

    const institutosVisibles = institutos.filter(
      (instituto) => !scope.institutoId || instituto.id === scope.institutoId,
    );

    const areasVisibles = areas.filter((area) => {
      if (scope.areaId) return area.id === scope.areaId;
      if (scope.institutoId) return area.institutoId === scope.institutoId;
      if (efectivos.instituto) return area.institutoId === efectivos.instituto;
      return true;
    });

    const profesionalesVisibles = profesionales
      .filter((profesional) => {
        if (scope.profesionalId) return profesional.id === scope.profesionalId;
        if (scope.areaId && profesional.areaId !== scope.areaId) return false;
        if (scope.institutoId && profesional.institutoId !== scope.institutoId) {
          return false;
        }
        if (efectivos.instituto && profesional.institutoId !== efectivos.instituto) {
          return false;
        }
        if (efectivos.area && profesional.areaId !== efectivos.area) return false;
        if (efectivos.cargo && profesional.cargoId !== efectivos.cargo) return false;
        return profesional.activo;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return {
      institutos: institutosVisibles,
      areas: areasVisibles,
      cargos: cargos.map((cargo) => ({ value: cargo.id, label: cargo.nombre })),
      profesionales: profesionalesVisibles,
      periodos,
    };
  }, [catalogoQuery.data, efectivos, scope]);

  const resumen = useMemo(() => {
    if (!catalogoQuery.data) return [];
    return resumenFiltros(efectivos, catalogoQuery.data);
  }, [catalogoQuery.data, efectivos]);

  const bloqueados: FiltrosBloqueados = {
    instituto: Boolean(scope.institutoId),
    area: Boolean(scope.areaId),
    cargo: Boolean(scope.cargoId),
    profesional: Boolean(scope.profesionalId),
  };

  const etiquetaAlcance = useMemo(() => {
    if (!catalogoQuery.data) return '';
    return etiquetaDeAlcance(scope, catalogoQuery.data, usuario?.nombre);
  }, [catalogoQuery.data, scope, usuario?.nombre]);

  if (catalogoQuery.isPending) {
    return <PageLoader etiqueta="Cargando catálogo y filtros…" />;
  }

  if (catalogoQuery.isError || !catalogoQuery.data) {
    return (
      <div className="mx-auto max-w-lg py-20">
        <ErrorState
          mensaje={
            catalogoQuery.error instanceof Error
              ? catalogoQuery.error.message
              : undefined
          }
          onReintentar={() => void catalogoQuery.refetch()}
        />
      </div>
    );
  }

  const value: FiltersContextValue = {
    filtros: efectivos,
    catalogo: catalogoQuery.data,
    scope,
    opciones,
    bloqueados,
    resumen,
    etiquetaAlcance,
    setFiltro,
    irA,
    limpiar,
  };

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFiltros(): FiltersContextValue {
  const contexto = useContext(FiltersContext);
  if (!contexto) {
    throw new Error('useFiltros debe usarse dentro de <FiltersProvider>.');
  }
  return contexto;
}
