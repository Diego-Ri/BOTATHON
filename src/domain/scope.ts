import type { Scope, Usuario } from './types';

/** Convierte el usuario en un alcance de datos no negociable. */
export function alcanceDeUsuario(usuario: Usuario): Scope {
  switch (usuario.rol) {
    case 'profesional':
      return {
        rol: usuario.rol,
        institutoId: usuario.institutoId,
        areaId: usuario.areaId,
        profesionalId: usuario.profesionalId,
        cargoId: usuario.cargoId,
      };
    case 'jefatura_area':
      return {
        rol: usuario.rol,
        institutoId: usuario.institutoId,
        areaId: usuario.areaId,
      };
    case 'direccion_instituto':
      return {
        rol: usuario.rol,
        institutoId: usuario.institutoId,
      };
    case 'direccion_nacional':
      return { rol: usuario.rol };
  }
}

export function alcanceEstaAcotado(scope: Scope): boolean {
  return Boolean(scope.institutoId || scope.areaId || scope.profesionalId);
}
