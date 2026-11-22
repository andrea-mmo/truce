import { addDays, dow as dowOf, mondayOf, weekNumber, WEEK_ORDER } from './dates';
import type { Dow, Settings, Treatment } from './types';

/** Automatic retinol ramp-up (R6): 1 night/week in weeks 1–3, then 2. */
export const RETINOL_AUTO_EARLY: Dow[] = [4]; // Thursday
export const RETINOL_AUTO_LATER: Dow[] = [1, 4]; // Monday + Thursday
export const RETINOL_RAMP_WEEK = 4;

export function retinolNights(settings: Settings, week: number): Dow[] {
  if (settings.retinoidPaused) return []; // T4
  if (settings.ret && settings.ret.length) return settings.ret;
  return week >= RETINOL_RAMP_WEEK ? RETINOL_AUTO_LATER : RETINOL_AUTO_EARLY;
}

export type RetinolMode = 'paused' | 'manual' | 'auto-early' | 'auto-later';

export function retinolMode(settings: Settings, week: number): RetinolMode {
  if (settings.retinoidPaused) return 'paused';
  if (settings.ret && settings.ret.length) return 'manual';
  return week >= RETINOL_RAMP_WEEK ? 'auto-later' : 'auto-early';
}

/**
 * Night treatment. Climbing day → BHA always wins, so BHA and retinol
 * can never fall on the same night (R2). Otherwise retinol on its nights,
 * azelaic the rest.
 */
export function treatmentFor(settings: Settings, d: Dow, week: number): Treatment {
  if (settings.climb.includes(d)) return 'bha';
  if (retinolNights(settings, week).includes(d)) return 'ret';
  return 'az';
}

/** Retinol nights that land on a climbing day (so they become BHA). */
export function retinolClimbClashes(settings: Settings, week: number): Dow[] {
  return retinolNights(settings, week).filter((d) => settings.climb.includes(d));
}

export interface StripDay {
  date: Date;
  dow: Dow;
  week: number;
  treatment: Treatment;
  climb: boolean;
  isToday: boolean;
}

/** Monday–Sunday strip for the week containing `today`. */
export function weekStrip(settings: Settings, today: Date): StripDay[] {
  const monday = mondayOf(today);
  const currentWeek = Math.max(weekNumber(settings.start, today), 1);
  const todayDow = dowOf(today);
  return WEEK_ORDER.map((d, i) => {
    const date = addDays(monday, i);
    const week = weekNumber(settings.start, date) || currentWeek;
    return {
      date,
      dow: d,
      week,
      treatment: treatmentFor(settings, d, week),
      climb: settings.climb.includes(d),
      isToday: d === todayDow,
    };
  });
}

/**
 * Toggle a day in a picker. With `max`, adding beyond the limit drops the
 * oldest choice (same behaviour as the prototype).
 */
export function toggleDay(days: Dow[], d: Dow, max?: number): Dow[] {
  const next = days.slice();
  const i = next.indexOf(d);
  if (i > -1) next.splice(i, 1);
  else {
    next.push(d);
    if (max && next.length > max) next.shift();
  }
  return next;
}
