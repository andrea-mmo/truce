import { addDays, dayIndex, dow, parseYmd, toYmd, weekNumber } from './dates';
import { buildEvening, buildMorning, TREATMENT_STEP_ID, type RoutineProduct } from './routine';
import { type LogScore } from './tips';
import { treatmentAdvice } from './advice';
import type { DiaryDay } from './diary';
import type { Phase, PlanState } from './types';

/**
 * Points, streaks and badges. Rewards consistency only: every step is worth
 * the same, so doing *more* actives never earns more. Skipping the treatment
 * on purpose counts as done (and earns a bonus when R10 says to skip).
 */

/** A step skipped on purpose is stored in the same checks map as `skip:<stepId>`. */
export const SKIP_PREFIX = 'skip:';
export const TREATMENT_STEP = TREATMENT_STEP_ID;

export const POINTS = {
  step: 1,
  routineComplete: 5,
  note: 3,
  listenedToSkin: 3,
  weeklyLog: 10,
} as const;

export type Checks = Record<string, boolean>;

export function isResolved(checks: Checks, stepId: string): boolean {
  return !!checks[stepId] || !!checks[SKIP_PREFIX + stepId];
}

export function isSkipped(checks: Checks, stepId: string): boolean {
  return !!checks[SKIP_PREFIX + stepId] && !checks[stepId];
}

export interface DayProgress {
  amDone: number; amTotal: number;
  pmDone: number; pmTotal: number;
  amComplete: boolean; pmComplete: boolean;
  /** Both routines done. */
  complete: boolean;
  skippedTreatment: boolean;
}

export interface ScoreInput {
  phases: Phase[];
  products: RoutineProduct[];
  state: PlanState;
  today: Date;
  /** Check marks by date (YYYY-MM-DD). */
  checksByDate: Record<string, Checks>;
  /** Dates with a diary note. */
  noteDates: string[];
  logs: LogScore[];
  /** Diary tags, so skipping when F1/F2 advise it also counts as listening. */
  diary?: DiaryDay[];
}

export function dayProgress(
  phases: Phase[], products: RoutineProduct[], state: PlanState, date: Date, checks: Checks,
): DayProgress {
  const week = Math.max(weekNumber(state.settings.start, date), 1);
  const ctx = { phases, state, week, dow: dow(date), date, products };
  const am = buildMorning(ctx);
  const pm = buildEvening(ctx);
  const amDone = am.filter((s) => isResolved(checks, s.id)).length;
  const pmDone = pm.filter((s) => isResolved(checks, s.id)).length;
  const amComplete = amDone === am.length;
  const pmComplete = pmDone === pm.length;
  return {
    amDone, amTotal: am.length, pmDone, pmTotal: pm.length,
    amComplete, pmComplete, complete: amComplete && pmComplete,
    skippedTreatment: isSkipped(checks, TREATMENT_STEP),
  };
}

export interface DayPoints {
  total: number;
  listened: boolean;
}

export function dayPoints(input: ScoreInput, ymd: string): DayPoints {
  const { phases, products, state, checksByDate, noteDates, logs } = input;
  const date = parseYmd(ymd);
  const p = dayProgress(phases, products, state, date, checksByDate[ymd] ?? {});
  const week = weekNumber(state.settings.start, date);
  // Skipping the treatment when the rules advise it (R10, F1, F2) earns the bonus.
  const listened = p.skippedTreatment && !!treatmentAdvice({ date, week, logs, diary: input.diary ?? [] });
  const total =
    (p.amDone + p.pmDone) * POINTS.step +
    (p.amComplete ? POINTS.routineComplete : 0) +
    (p.pmComplete ? POINTS.routineComplete : 0) +
    (noteDates.includes(ymd) ? POINTS.note : 0) +
    (listened ? POINTS.listenedToSkin : 0);
  return { total, listened };
}

export type BadgeId =
  | 'firstDay' | 'streak7' | 'streak30' | 'diary7' | 'checkins4'
  | 'listened' | 'resetDone' | 'firstTrial';

export const BADGE_ORDER: BadgeId[] = [
  'firstDay', 'streak7', 'diary7', 'checkins4', 'listened', 'resetDone', 'firstTrial', 'streak30',
];

export interface Level { n: number; from: number; to: number | null }
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];

export function levelFor(points: number): Level {
  let n = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) if (points >= LEVEL_THRESHOLDS[i]) n = i;
  return { n, from: LEVEL_THRESHOLDS[n], to: LEVEL_THRESHOLDS[n + 1] ?? null };
}

export interface Score {
  totalPoints: number;
  todayPoints: number;
  /** Consecutive complete days ending today (or yesterday, while today is in progress). */
  streak: number;
  bestStreak: number;
  completeDays: number;
  badges: BadgeId[];
  level: Level;
}

export function computeScore(input: ScoreInput): Score {
  const { phases, products, state, today, checksByDate, noteDates, logs } = input;
  const todayKey = toYmd(today);
  const isPastOrToday = (d: string) => d <= todayKey;

  const dates = [...new Set([...Object.keys(checksByDate), ...noteDates])].filter(isPastOrToday).sort();
  let total = 0;
  let listenedEver = false;
  const complete = new Set<string>();
  for (const d of dates) {
    const p = dayPoints(input, d);
    total += p.total;
    if (p.listened) listenedEver = true;
    if (dayProgress(phases, products, state, parseYmd(d), checksByDate[d] ?? {}).complete) complete.add(d);
  }
  const loggedWeeks = new Set(logs.map((l) => l.week));
  total += loggedWeeks.size * POINTS.weeklyLog;

  // Current streak: today counts if complete; if not, it isn't broken yet.
  let streak = 0;
  let cursor = complete.has(todayKey) ? today : addDays(today, -1);
  while (complete.has(toYmd(cursor))) { streak++; cursor = addDays(cursor, -1); }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...complete].sort()) {
    run = prev && dayIndex(prev, parseYmd(d)) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  const week = weekNumber(state.settings.start, today);
  const badges = new Set<BadgeId>();
  if (complete.size >= 1) badges.add('firstDay');
  if (best >= 7) badges.add('streak7');
  if (best >= 30) badges.add('streak30');
  if (noteDates.filter(isPastOrToday).length >= 7) badges.add('diary7');
  if (loggedWeeks.size >= 4) badges.add('checkins4');
  if (listenedEver) badges.add('listened');
  const resetEnd = phases.find((p) => p.id === 'reset')?.to ?? 6;
  if (week > resetEnd && state.resetVerdict) badges.add('resetDone');
  if (Object.keys(state.reintro).length >= 1) badges.add('firstTrial');

  return {
    totalPoints: total,
    todayPoints: dates.includes(todayKey) ? dayPoints(input, todayKey).total : 0,
    streak,
    bestStreak: best,
    completeDays: complete.size,
    badges: BADGE_ORDER.filter((b) => badges.has(b)),
    level: levelFor(total),
  };
}
