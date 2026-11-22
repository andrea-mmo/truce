import { addDays, daysBetween, parseYmd, toYmd } from './dates';
import type { Phase, PlanState, TrialId } from './types';

/**
 * A dated goal ("boda en mayo"). The app can't promise results; it tracks
 * consistency up to the date and warns about plan steps that clash with it.
 */
export interface Challenge {
  name: string;
  /** Event date, YYYY-MM-DD. */
  date: string;
  /** Day the challenge was created, YYYY-MM-DD. */
  createdAt: string;
}

/**
 * D4 (2-week trial) + D5 (1-week rest if it goes badly) → don't start a new
 * product in the last 3 weeks before the event.
 */
export const NO_NEW_PRODUCTS_DAYS = 21;

export type ChallengeWarning =
  | { kind: 'noNewProducts'; ruleId: 'D4+D5' }
  | { kind: 'trialClash'; ruleId: 'D4+D5'; trial: TrialId; trialStart: string; trialEnd: string };

export interface ChallengeStatus {
  daysLeft: number;
  isPast: boolean;
  isToday: boolean;
  /** Days from creation to today (inclusive), capped at the event date. */
  daysTracked: number;
  daysComplete: number;
  /** 0–1, or null if nothing to measure yet. */
  consistency: number | null;
  warnings: ChallengeWarning[];
}

export function challengeStatus(
  ch: Challenge,
  today: Date,
  phases: Phase[],
  state: PlanState,
  completeDates: string[],
): ChallengeStatus {
  const event = parseYmd(ch.date);
  const daysLeft = daysBetween(today, event);
  const created = parseYmd(ch.createdAt);
  const last = daysLeft < 0 ? event : today;
  const daysTracked = Math.max(0, daysBetween(created, last) + 1);
  const from = ch.createdAt;
  const to = toYmd(last);
  const daysComplete = completeDates.filter((d) => d >= from && d <= to).length;

  const warnings: ChallengeWarning[] = [];
  if (daysLeft >= 0 && daysLeft <= NO_NEW_PRODUCTS_DAYS) warnings.push({ kind: 'noNewProducts', ruleId: 'D4+D5' });

  // A trial whose window (plus the rest week) contains the event date.
  if (daysLeft >= 0 && state.resetVerdict !== 'same') {
    const start = parseYmd(state.settings.start);
    for (const p of phases) {
      if (p.id === 'reset' || p.id === 'keep' || state.reintro[p.id]) continue;
      const tStart = addDays(start, (p.from - 1) * 7);
      const tEnd = addDays(start, p.to * 7 - 1);
      const guardEnd = addDays(tEnd, 7);
      if (daysBetween(tStart, event) >= 0 && daysBetween(event, guardEnd) >= 0) {
        warnings.push({ kind: 'trialClash', ruleId: 'D4+D5', trial: p.id, trialStart: toYmd(tStart), trialEnd: toYmd(tEnd) });
      }
    }
  }

  return {
    daysLeft,
    isPast: daysLeft < 0,
    isToday: daysLeft === 0,
    daysTracked,
    daysComplete,
    consistency: daysTracked > 0 ? Math.min(1, daysComplete / daysTracked) : null,
    warnings,
  };
}
