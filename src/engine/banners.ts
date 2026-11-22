import { dayIndex } from './dates';
import { findPhase } from './phases';
import type { Dow, Phase, PlanState, TriageId, TrialId } from './types';

export type Banner =
  | { kind: 'triage'; signals: TriageId[] }
  | { kind: 'notStarted'; start: string }
  | { kind: 'climbDay' }
  | { kind: 'firstWeek' }
  | { kind: 'resetDecision' }
  | { kind: 'trialEnd'; trial: TrialId }
  | { kind: 'pastDay' }
  | { kind: 'profile'; status: 'missing' | 'review' };

export interface BannerContext {
  phases: Phase[];
  state: PlanState;
  /** Raw week number: 0 = not started yet. */
  week: number;
  dow: Dow;
  today: Date;
  /** Triage answers from the profile (section A of REGLAS). */
  triage: TriageId[];
  /** Products in an ad-hoc 2-week trial (D4), outside the reset plan. */
  adhocTrials?: { key: string; start: string }[];
  /** Quiz not done / prefilled and pending review. */
  profile?: 'missing' | 'review' | 'ok';
  /** Looking at an earlier day: only triage and a reminder, no day-specific tips or questions. */
  viewingPast?: boolean;
}

const TRIAGE_ORDER: TriageId[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Banners for "Hoy", in display order. Triage always comes first
 * (principle 5: alarm signals win over any routine).
 */
export function computeBanners(ctx: BannerContext): Banner[] {
  const { phases, state, week, dow, today } = ctx;
  const out: Banner[] = [];

  // D3: no improvement after the reset → T6.
  const signals = new Set(ctx.triage);
  if (state.resetVerdict === 'same') signals.add('T6');
  if (signals.size) out.push({ kind: 'triage', signals: TRIAGE_ORDER.filter((t) => signals.has(t)) });
  if (ctx.profile && ctx.profile !== 'ok') out.push({ kind: 'profile', status: ctx.profile });

  if (ctx.viewingPast) {
    out.push({ kind: 'pastDay' });
    return out;
  }

  if (week === 0) out.push({ kind: 'notStarted', start: state.settings.start });
  if (state.settings.climb.includes(dow)) out.push({ kind: 'climbDay' });
  if (week === 1 && dayIndex(state.settings.start, today) % 7 < 3) out.push({ kind: 'firstWeek' });

  const reset = findPhase(phases, 'reset');
  if (week > reset.to && !state.resetVerdict) out.push({ kind: 'resetDecision' });

  if (state.resetVerdict !== 'same') {
    for (const p of phases) {
      if (p.id === 'reset' || p.id === 'keep') continue;
      if (week === p.to + 1 && !state.reintro[p.id]) out.push({ kind: 'trialEnd', trial: p.id });
    }
    for (const t of ctx.adhocTrials ?? []) {
      if (dayIndex(t.start, today) >= 14 && !state.reintro[t.key]) out.push({ kind: 'trialEnd', trial: t.key });
    }
  }
  return out;
}
