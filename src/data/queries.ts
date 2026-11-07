import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Filtros, Scope } from '@/domain/types';
import { repositorio } from './repository';

export const clavesConsulta = {
  catalogo: ['catalogo'] as const,
  metas: (filtros: Filtros, scope: Scope) =>
    ['metas', filtros, scope] as const,
  serie: (filtros: Filtros, scope: Scope) =>
    ['serie', filtros, scope] as const,
};

export function useCatalogo() {
  return useQuery({
    queryKey: clavesConsulta.catalogo,
    queryFn: () => repositorio.obtenerCatalogo(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useMetas(filtros: Filtros, scope: Scope) {
  return useQuery({
    queryKey: clavesConsulta.metas(filtros, scope),
    queryFn: () => repositorio.obtenerMetas(filtros, scope),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useSerieMensual(filtros: Filtros, scope: Scope) {
  return useQuery({
    queryKey: clavesConsulta.serie(filtros, scope),
    queryFn: () => repositorio.obtenerSerieMensual(filtros, scope),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
