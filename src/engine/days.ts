import { addDays, daysBetween } from './dates';

/** How many days back you can go to fill in missed check marks or notes. */
export const MAX_DAYS_BACK = 7;

/** Offset from today, in days: 0 = today, -1 = yesterday. Never in the future. */
export function clampOffset(offset: number, maxBack = MAX_DAYS_BACK): number {
  return Math.min(0, Math.max(-maxBack, Math.trunc(offset)));
}

export function dateForOffset(today: Date, offset: number): Date {
  return addDays(today, clampOffset(offset));
}

/** Offset of `date` from today, or null if it can't be opened (future or too old). */
export function offsetFor(today: Date, date: Date, maxBack = MAX_DAYS_BACK): number | null {
  const diff = daysBetween(today, date);
  return diff > 0 || diff < -maxBack ? null : diff;
}
