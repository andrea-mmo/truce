/** Dates and numbers in the current language (e.g. "2,5" in Spanish, "2.5" in English). */
import { getLang, LOCALE } from './lang';

export function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString(LOCALE[getLang()], opts);
}

export function fmtDateTime(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return d.toLocaleString(LOCALE[getLang()], opts);
}

/** Same as String(n) (no rounding), with the local decimal separator. */
export function fmtNum(n: number): string {
  return n.toLocaleString(LOCALE[getLang()], { maximumFractionDigits: 10 });
}

/** "Domingo, 22 de noviembre" → first letter in capitals. */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
