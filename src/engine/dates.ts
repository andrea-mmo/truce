import type { Dow } from './types';

const DAY_MS = 86_400_000;

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar-day difference, immune to daylight-saving changes. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

/** Days since the reset started (0 on the start day, negative before). */
export function dayIndex(start: string, date: Date): number {
  return daysBetween(parseYmd(start), date);
}

/** Week of the plan: 0 = not started yet, 1 = first week, … */
export function weekNumber(start: string, date: Date): number {
  const diff = dayIndex(start, date);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}

export function dow(date: Date): Dow {
  return date.getDay() as Dow;
}

export function previousDow(d: Dow): Dow {
  return ((d + 6) % 7) as Dow;
}

/** Monday-first order used for the week strip and the day pickers. */
export const WEEK_ORDER: Dow[] = [1, 2, 3, 4, 5, 6, 0];

/** Monday of the week containing `date`. */
export function mondayOf(date: Date): Date {
  const m = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/** June–August. Used to swap the day cream for a lighter one. */
export function isSummer(date: Date): boolean {
  const m = date.getMonth();
  return m >= 5 && m <= 7;
}
