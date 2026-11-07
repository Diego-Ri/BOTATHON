import { PERIODOS } from '@/domain/constants';

const numero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const decimal1 = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const decimal2 = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fecha = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const fechaHora = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatearNumero(valor: number): string {
  return numero.format(Number.isFinite(valor) ? valor : 0);
}

export function formatearDecimal(valor: number, decimales: 1 | 2 = 1): string {
  const formato = decimales === 1 ? decimal1 : decimal2;
  return formato.format(Number.isFinite(valor) ? valor : 0);
}

export function formatearPct(valor: number, decimales: 1 | 2 = 1): string {
  return `${formatearDecimal(valor, decimales)}%`;
}

export function formatearPctConSigno(valor: number): string {
  const signo = valor > 0 ? '+' : '';
  return `${signo}${formatearDecimal(valor)}%`;
}

export function formatearHoras(valor: number): string {
  return `${formatearDecimal(valor)} h`;
}

export function formatearEntero(valor: number): string {
  return formatearNumero(valor);
}

export function etiquetaPeriodo(id: string, corta = false): string {
  const periodo = PERIODOS.find((item) => item.id === id);
  if (!periodo) return id;
  return corta ? periodo.corta : periodo.etiqueta;
}

export function etiquetaPeriodoCorta(id: string): string {
  return etiquetaPeriodo(id, true);
}

export function formatearFecha(valor: Date | string): string {
  const fechaValor = typeof valor === 'string' ? new Date(valor) : valor;
  if (Number.isNaN(fechaValor.getTime())) return '—';
  return fecha.format(fechaValor);
}

export function formatearFechaHora(valor: Date | string): string {
  const fechaValor = typeof valor === 'string' ? new Date(valor) : valor;
  if (Number.isNaN(fechaValor.getTime())) return '—';
  return fechaHora.format(fechaValor);
}

export function fechaParaArchivo(valor = new Date()): string {
  const anio = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Limpia tildes y caracteres no seguros para nombres de archivo. */
export function nombreArchivo(partes: string[], extension: string): string {
  const base = partes
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${base}.${extension}`;
}

export function pluralizar(
  cantidad: number,
  singular: string,
  plural: string,
): string {
  return cantidad === 1 ? singular : plural;
}
