import { dayIndex, previousDow } from './dates';
import { tagsOn, type DiaryDay } from './diary';
import { isProductInTrial } from './phases';
import { RETINOL_RAMP_WEEK, retinolMode, treatmentFor } from './schedule';
import type { Dow, Phase, PlanState, TrialId } from './types';

/**
 * Daily tips. Deterministic: same inputs → same tips. Each tip points to the
 * rule it comes from (ruleId, see docs/REGLAS.md). Texts live in src/i18n (es.ts, en.ts).
 */
export type TipId =
  | 'irritationTonight'   // R10
  | 'irritationLowerFreq' // R10 (repeated)
  | 'retinolHold'         // R6
  | 'retinolRamp'         // R6
  | 'spfAfterActive'      // R5
  | 'activesBackToBack'   // plan rule card (R2 extension)
  | 'trialFocus'          // D4
  | 'weeklyCheckIn'       // SPEC §3.7
  | 'stingingTonight'     // F1
  | 'afterPicking'        // F2
  | 'newProductInTrial'   // F3 + D4
  | 'newProductOneByOne'  // F3
  | 'makeupDoubleCleanse' // F4 + C5
  | 'afterSport';         // R9

export interface Tip {
  id: TipId;
  ruleId: string;
  severity: 'info' | 'warn';
  trial?: { id: TrialId; day: number; of: number };
}

export interface LogScore {
  week: number;
  irritation: number | null;
}

export interface TipContext {
  phases: Phase[];
  state: PlanState;
  /** Raw week number (0 = not started). */
  week: number;
  dow: Dow;
  today: Date;
  logs: LogScore[];
  /** Recent diary tags (REGLAS.md → F). */
  diary?: DiaryDay[];
  /** From the profile: sweaty sport days (R9) and daily makeup (C5). */
  sportDays?: Dow[];
  dailyMakeup?: boolean;
  /** Ad-hoc product trials (D4). */
  adhocTrials?: { key: string; start: string }[];
}

/** R10 threshold. */
export const IRRITATION_LIMIT = 3;

const irritated = (logs: LogScore[], week: number) =>
  (logs.find((l) => l.week === week)?.irritation ?? -1) >= IRRITATION_LIMIT;

/** R10 is active for a plan week: irritation ≥ 3 that week or the one before. */
export function isIrritationActive(logs: LogScore[], week: number): boolean {
  return irritated(logs, week) || irritated(logs, week - 1);
}

export function computeTips(ctx: TipContext): Tip[] {
  const { phases, state, week, dow, today, logs } = ctx;
  const s = state.settings;
  const tips: Tip[] = [];
  const diary = ctx.diary ?? [];
  const todayTags = tagsOn(diary, today, 0);
  const yesterdayTags = tagsOn(diary, today, -1);

  // Diary tags (F1–F4). They work even before the plan starts.
  if (todayTags.includes('stinging')) tips.push({ id: 'stingingTonight', ruleId: 'F1', severity: 'warn' });
  if (todayTags.includes('picked') || yesterdayTags.includes('picked')) {
    tips.push({ id: 'afterPicking', ruleId: 'F2', severity: 'warn' });
  }
  if (todayTags.includes('makeup')) tips.push({ id: 'makeupDoubleCleanse', ruleId: 'F4', severity: 'info' });
  else if (ctx.dailyMakeup) tips.push({ id: 'makeupDoubleCleanse', ruleId: 'C5', severity: 'info' });
  // R9: sport day without a BHA night (climbing days already have their own banner).
  if (ctx.sportDays?.includes(dow) && !s.climb.includes(dow)) tips.push({ id: 'afterSport', ruleId: 'R9', severity: 'info' });
  if (todayTags.includes('newProduct')) {
    const inTrial = (week > 0 && phases.some((p) => p.id !== 'reset' && p.id !== 'keep' && isProductInTrial(phases, p.id, week, state)))
      || (ctx.adhocTrials ?? []).some((t) => { const d = dayIndex(t.start, today); return d >= 0 && d < 14; });
    tips.push(inTrial
      ? { id: 'newProductInTrial', ruleId: 'F3', severity: 'warn' }
      : { id: 'newProductOneByOne', ruleId: 'F3', severity: 'info' });
  }

  if (week === 0) return sortTips(tips);

  // R10: irritation ≥ 3 this week or last week → tonight without active.
  const now = irritated(logs, week);
  const before = irritated(logs, week - 1);
  if (now || before) tips.push({ id: 'irritationTonight', ruleId: 'R10', severity: 'warn' });
  if (now && before) tips.push({ id: 'irritationLowerFreq', ruleId: 'R10', severity: 'warn' });

  const tonight = treatmentFor(s, dow, week);
  const yesterdayDow = previousDow(dow);
  const yesterdayWeek = dayIndex(s.start, today) % 7 === 0 ? week - 1 : week;
  const lastNight = yesterdayWeek >= 1 ? treatmentFor(s, yesterdayDow, yesterdayWeek) : null;

  // R6: retinol ramp-up only without irritation.
  if (tonight === 'ret' && retinolMode(s, week) !== 'manual') {
    if (week === RETINOL_RAMP_WEEK && (now || before)) {
      tips.push({ id: 'retinolHold', ruleId: 'R6', severity: 'warn' });
    } else if (week <= RETINOL_RAMP_WEEK) {
      tips.push({ id: 'retinolRamp', ruleId: 'R6', severity: 'info' });
    }
  }

  // R5: after a BHA or retinol night, sunscreen without fail.
  if (lastNight === 'bha' || lastNight === 'ret') {
    tips.push({ id: 'spfAfterActive', ruleId: 'R5', severity: 'info' });
  }

  // Plan rule card: leave a day between BHA and retinol.
  if (lastNight && ((lastNight === 'ret' && tonight === 'bha') || (lastNight === 'bha' && tonight === 'ret'))) {
    tips.push({ id: 'activesBackToBack', ruleId: 'R2', severity: 'info' });
  }

  // D4: one product at a time during a trial.
  for (const p of phases) {
    if (p.id === 'reset' || p.id === 'keep') continue;
    if (isProductInTrial(phases, p.id, week, state)) {
      const day = dayIndex(s.start, today) - (p.from - 1) * 7 + 1;
      tips.push({ id: 'trialFocus', ruleId: 'D4', severity: 'info', trial: { id: p.id, day, of: (p.to - p.from + 1) * 7 } });
    }
  }

  // D4 for products added outside the plan.
  for (const t of ctx.adhocTrials ?? []) {
    const d = dayIndex(t.start, today);
    if (d >= 0 && d < 14) tips.push({ id: 'trialFocus', ruleId: 'D4', severity: 'info', trial: { id: t.key, day: d + 1, of: 14 } });
  }

  // Weekly check-in on Sunday if this week isn't scored yet.
  if (dow === 0 && !logs.some((l) => l.week === week)) {
    tips.push({ id: 'weeklyCheckIn', ruleId: 'SPEC-3.7', severity: 'info' });
  }

  return sortTips(tips);
}

function sortTips(tips: Tip[]): Tip[] {
  // Warnings first; F1 replaces the weekly R10 tip for tonight (same advice).
  const out = tips.some((t) => t.id === 'stingingTonight') ? tips.filter((t) => t.id !== 'irritationTonight') : tips;
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warn' ? -1 : 1));
}
