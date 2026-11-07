import { clsx, type ClassValue } from 'clsx';

export function cn(...entradas: ClassValue[]): string {
  return clsx(entradas);
}
