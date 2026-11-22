/**
 * Turns today's rules into marks on the routine steps, so a tip like
 * "esta noche, sin tratamiento" shows on the step itself. Same rules as the
 * tips (R10, F1, F2); the person still decides (nothing is skipped for her).
 */
import { tagsOn, type DiaryDay } from './diary';
import { TREATMENT_STEP_ID, type RoutineProduct, type Step } from './routine';
import { isIrritationActive, type LogScore } from './tips';

export interface StepAdvice {
  /** skip = better not today; caution = use with care (avoid open areas). */
  kind: 'skip' | 'caution';
  ruleId: 'R10' | 'F1' | 'F2';
}

export interface AdviceInput {
  date: Date;
  /** Raw plan week (0 = not started). */
  week: number;
  logs: LogScore[];
  diary: DiaryDay[];
}

/** What applies to the night treatment (step 3) on that day. */
export function treatmentAdvice(i: AdviceInput): StepAdvice | null {
  if (tagsOn(i.diary, i.date, 0).includes('stinging')) return { kind: 'skip', ruleId: 'F1' };
  if (i.week > 0 && isIrritationActive(i.logs, i.week)) return { kind: 'skip', ruleId: 'R10' };
  if (tagsOn(i.diary, i.date, 0).includes('picked') || tagsOn(i.diary, i.date, -1).includes('picked')) {
    return { kind: 'caution', ruleId: 'F2' };
  }
  return null;
}

/** Marks per step id for one day's routine. */
export function adviseSteps(steps: Step[], products: RoutineProduct[], i: AdviceInput): Record<string, StepAdvice> {
  const out: Record<string, StepAdvice> = {};
  const treat = treatmentAdvice(i);
  const exfoliant = (id?: number) => {
    const p = products.find((x) => x.id === id);
    return !!p && p.actives.some((a) => a === 'aha' || a === 'bha' || a === 'pha' || a === 'retinoid');
  };
  for (const s of steps) {
    if (s.id === TREATMENT_STEP_ID && treat) out[s.id] = treat;
    // Exfoliating toners in the morning follow the same advice as the night active.
    else if (s.role === 'product' && exfoliant(s.productId) && treat) out[s.id] = treat;
  }
  return out;
}
