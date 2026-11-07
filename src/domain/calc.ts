import type {
  Configuracion,
  Indicadores,
  MetaMensual,
  Semaforo,
  TotalesMeta,
} from './types';

export function redondear(valor: number, decimales = 1): number {
  if (!Number.isFinite(valor)) return 0;
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

export function dividirSeguro(numerador: number, denominador: number): number {
  if (!Number.isFinite(numerador) || !Number.isFinite(denominador) || denominador === 0) {
    return 0;
  }
  return numerador / denominador;
}

export function porcentaje(parte: number, total: number, decimales = 1): number {
  return redondear(dividirSeguro(parte, total) * 100, decimales);
}

/**
 * Suma registros crudos. Los porcentajes NUNCA se promedian: se recalculan
 * sobre el total para que el consolidado cuadre con el motor.
 */
export function agregarMetas(registros: MetaMensual[]): TotalesMeta {
  const profesionales = new Set<string>();

  const totales: TotalesMeta = {
    profesionales: 0,
    atencionesObjetivo: 0,
    atencionesRealizadas: 0,
    horasDirectas: 0,
    horasIndirectas: 0,
    horasNAS: 0,
    horasContratadas: 0,
    planificado: 0,
    sic: 0,
  };

  for (const registro of registros) {
    profesionales.add(registro.profesionalId);
    totales.atencionesObjetivo += registro.atencionesObjetivo;
    totales.atencionesRealizadas += registro.atencionesRealizadas;
    totales.horasDirectas += registro.horasDirectas;
    totales.horasIndirectas += registro.horasIndirectas;
    totales.horasNAS += registro.horasNAS;
    totales.horasContratadas += registro.horasContratadas;
    totales.planificado += registro.planificado;
    totales.sic += registro.sic;
  }

  totales.profesionales = profesionales.size;
  return totales;
}

export function calcularIndicadores(totales: TotalesMeta): Indicadores {
  const horasAsistenciales = totales.horasDirectas + totales.horasIndirectas;

  return {
    ...totales,
    horasAsistenciales,
    metaGestion: porcentaje(totales.atencionesRealizadas, totales.atencionesObjetivo),
    foja: porcentaje(horasAsistenciales, totales.horasContratadas),
    desviacion: porcentaje(
      totales.sic - totales.planificado,
      totales.planificado,
    ),
  };
}

/** Única puerta de entrada al motor para cálculos de pantalla. */
export function calcularDesdeRegistros(registros: MetaMensual[]): Indicadores {
  return calcularIndicadores(agregarMetas(registros));
}

/**
 * Semáforo simétrico: |desviación| ≤ 50% del umbral = verde;
 * ≤ 100% del umbral = ámbar; sobre el umbral = rojo.
 * Con el umbral por defecto (10%): 0–5% verde, 5–10% ámbar, >10% alerta.
 */
export function clasificarDesviacion(
  desviacion: number,
  umbral: number,
  hayDatos = true,
): Semaforo {
  if (!hayDatos) return 'sin-datos';
  if (!Number.isFinite(desviacion)) return 'sin-datos';

  const umbralSeguro = Math.max(0, umbral);
  const absoluta = Math.abs(desviacion);
  const limiteVerde = umbralSeguro * 0.5;

  if (absoluta <= limiteVerde) return 'ok';
  if (absoluta <= umbralSeguro) return 'atencion';
  return 'alerta';
}

export function semaforoDeIndicadores(
  indicadores: Indicadores,
  configuracion: Configuracion,
): Semaforo {
  return clasificarDesviacion(
    indicadores.desviacion,
    configuracion.umbralDesviacion,
    indicadores.planificado > 0,
  );
}

export function superaUmbral(
  indicadores: Indicadores,
  configuracion: Configuracion,
): boolean {
  return semaforoDeIndicadores(indicadores, configuracion) === 'alerta';
}

/** Diferencia en puntos porcentuales frente a la meta de gestión. */
export function brechaMetaGestion(
  indicadores: Indicadores,
  configuracion: Configuracion,
): number {
  return redondear(indicadores.metaGestion - configuracion.metaGestionObjetivo, 1);
}

export function estaBajoMetaGestion(
  indicadores: Indicadores,
  configuracion: Configuracion,
): boolean {
  return indicadores.metaGestion < configuracion.metaGestionObjetivo;
}

export function sumarHoras(
  totales: Pick<
    TotalesMeta,
    'horasDirectas' | 'horasIndirectas' | 'horasNAS'
  >,
): number {
  return (
    totales.horasDirectas + totales.horasIndirectas + totales.horasNAS
  );
}

/** Indica si el desglose de horas cuadra exactamente con las horas contratadas. */
export function horasCuadran(
  totales: Pick<
    TotalesMeta,
    'horasDirectas' | 'horasIndirectas' | 'horasNAS' | 'horasContratadas'
  >,
  tolerancia = 0.01,
): boolean {
  return (
    Math.abs(sumarHoras(totales) - totales.horasContratadas) <= tolerancia
  );
}
