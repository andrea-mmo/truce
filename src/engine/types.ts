/** Day of week as returned by Date#getDay(): 0 = Sunday … 6 = Saturday. */
export type Dow = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Night treatment (step 3 of the PM routine). One strong active per night (rule R1). */
export type Treatment = 'az' | 'bha' | 'ret';

/** Products that are paused during the reset and reintroduced one at a time (D4). */
/** A product in the reintroduction queue, as `p<productId>` (see productKey). */
export type TrialId = string;
export type TrialResult = 'ok' | 'bad';
export type ResetVerdict = 'better' | 'same' | null;

export type TriageId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7';

export interface Settings {
  /** Reset start date, YYYY-MM-DD (local). */
  start: string;
  /** Climbing days → BHA those nights (R9). */
  climb: Dow[];
  /** Retinol nights chosen by hand; null = automatic ramp-up (R6). */
  ret: Dow[] | null;
  /** Glycolic toner mornings (from its trial onwards). Max 2. */
  gly: Dow[];
  /** T4 (pregnancy, trying, breastfeeding): no retinoid nights at all. Set from the profile. */
  retinoidPaused?: boolean;
}

export interface PlanState {
  settings: Settings;
  reintro: Record<TrialId, TrialResult>;
  resetVerdict: ResetVerdict;
}

export type PhaseId = 'reset' | TrialId | 'keep';

export interface Phase {
  id: PhaseId;
  /** First week (inclusive, 1-based). */
  from: number;
  /** Last week (inclusive). */
  to: number;
}
