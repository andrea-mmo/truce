import type { Phase, PhaseId, PlanState, TrialId } from './types';

export const RESET_WEEKS = 6; // D1
export const TRIAL_WEEKS = 2; // D4

/**
 * Build the plan timeline: reset, then one trial per product (in queue order),
 * then maintenance. The queue is ordered from lowest to highest risk (D4).
 */
export function buildPhases(
  queue: TrialId[],
  resetWeeks = RESET_WEEKS,
  trialWeeks = TRIAL_WEEKS,
): Phase[] {
  const phases: Phase[] = [{ id: 'reset', from: 1, to: resetWeeks }];
  let next = resetWeeks + 1;
  for (const id of queue) {
    phases.push({ id, from: next, to: next + trialWeeks - 1 });
    next += trialWeeks;
  }
  phases.push({ id: 'keep', from: next, to: Infinity });
  return phases;
}

export function phaseFor(phases: Phase[], week: number): Phase {
  const w = Math.max(week, 1);
  return phases.find((p) => w >= p.from && w <= p.to) ?? phases[phases.length - 1];
}

export function findPhase(phases: Phase[], id: PhaseId): Phase {
  const p = phases.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown phase: ${id}`);
  return p;
}

/** Product is back in the routine: its trial has started and it hasn't failed. */
export function isProductOn(phases: Phase[], id: TrialId, week: number, state: PlanState): boolean {
  if (state.reintro[id] === 'bad') return false;
  if (state.resetVerdict === 'same') return false; // D3 → T6: reintroduction on hold
  return week >= findPhase(phases, id).from;
}

/** Product is currently being tested (within its 2-week window). */
export function isProductInTrial(phases: Phase[], id: TrialId, week: number, state: PlanState): boolean {
  const p = findPhase(phases, id);
  return isProductOn(phases, id, week, state) && week <= p.to;
}

export type TimelineStatus = 'past' | 'now' | 'future';

export function timeline(phases: Phase[], week: number): { phase: Phase; status: TimelineStatus }[] {
  const w = Math.max(week, 1);
  return phases.map((phase) => ({
    phase,
    status: w > phase.to ? 'past' : w >= phase.from ? 'now' : 'future',
  }));
}
