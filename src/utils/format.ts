import { MESES } from '../types';

/** Format number as Bs. currency */
export function formatBs(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' Bs.';
}

/** Format number as USD currency */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Get month name from 1-indexed month number */
export function getMesNombre(mes: number): string {
  return MESES[mes - 1] ?? '';
}

/** Format ISO date string to localized date */
export function formatFecha(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Format ISO date to relative time (e.g. "hace 2 días") */
export function formatRelativa(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const seconds = diff / 1000;
    if (seconds < 60) return rtf.format(-Math.round(seconds), 'second');
    if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), 'minute');
    if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), 'hour');
    if (seconds < 2592000) return rtf.format(-Math.round(seconds / 86400), 'day');
    return formatFecha(iso);
  } catch {
    return formatFecha(iso);
  }
}

/** Get current month and year */
export function getCurrentMonthYear(): { mes: number; anio: number } {
  const now = new Date();
  return { mes: now.getMonth() + 1, anio: now.getFullYear() };
}

/** Get initials from name string */
export function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

/** Convert USD to Bs using given rate */
export function usdToBs(usd: number, tasa: number): number {
  return usd * tasa;
}

/** Convert Bs to USD using given rate */
export function bsToUsd(bs: number, tasa: number): number {
  return tasa > 0 ? bs / tasa : 0;
}
