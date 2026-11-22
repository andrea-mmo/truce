import type { Dow, Settings, TriageId } from './types';

/** Answers of the skin quiz (SPEC §3.1). Stored in kv 'profile' (synced). */
export type SkinType = 'dry' | 'oily' | 'combination' | 'normal' | 'unsure';
export type Concern = 'comedones' | 'pimples' | 'redness' | 'spots' | 'wrinkles' | 'pores';
export type Makeup = 'never' | 'occasional' | 'weekly' | 'daily';
export type Salon = 'none' | 'occasional' | 'regular';
export type Supplement = 'collagen' | 'whey' | 'biotin' | 'vitamins' | 'zinc' | 'omega3' | 'other';
export type YesNo = 'yes' | 'no';
export type BreakoutArea = 'jaw' | 'forehead' | 'cheeks' | 'nose' | 'back';
export type YesNoSkip = YesNo | 'skip';

export interface Profile {
  name: string;
  skinType: SkinType | null;
  concerns: Concern[];
  /** Days with sport that makes you sweat (R9: cleanse after training). */
  sportDays: Dow[];
  makeup: Makeup | null;
  /** Salon treatments (e.g. facials with extractions). Recorded only. */
  salon: Salon | null;
  /** Recorded only: never used for advice. */
  supplements: Supplement[];
  supplementsOther: string;
  /** Where breakouts appear most (recorded; jaw/chin feeds T3). Optional in older profiles. */
  breakoutAreas?: BreakoutArea[];
  /** Irregular period, more body hair than usual or hair loss (feeds T3). */
  hormonalSigns?: YesNo | null;
  /** Triage questions (REGLAS A). null = not answered yet. */
  triage: {
    T1: YesNo | null; // deep, painful, headless bumps
    T2: YesNo | null; // marks or scars that stay
    T3: YesNo | null; // legacy single question; replaced by breakoutAreas + hormonalSigns
    T4: YesNoSkip | null; // pregnancy, trying, breastfeeding (optional)
    T5: YesNo | null; // prescription treatment for skin/acne
  };
  /** Set when the person saves the quiz; null = prefilled, pending review. */
  reviewedAt: number | null;
}

export function emptyProfile(): Profile {
  return {
    name: '', skinType: null, concerns: [], sportDays: [], makeup: null, salon: null,
    supplements: [], supplementsOther: '', breakoutAreas: [], hormonalSigns: null,
    triage: { T1: null, T2: null, T3: null, T4: null, T5: null },
    reviewedAt: null,
  };
}

/**
 * T3: breakouts mainly on the jaw/chin AND irregular period, extra hair or
 * hair loss. Both are needed; profiles from before the split use the old answer.
 */
export function t3(p: Profile): boolean {
  if (p.hormonalSigns === undefined) return p.triage.T3 === 'yes';
  return (p.breakoutAreas ?? []).includes('jaw') && p.hormonalSigns === 'yes';
}

/** Alarm signals from the answers. T6 comes from the reset verdict, T7 from the diary. */
export function triageFromProfile(p: Profile): TriageId[] {
  const out: TriageId[] = [];
  if (p.triage.T1 === 'yes') out.push('T1');
  if (p.triage.T2 === 'yes') out.push('T2');
  if (t3(p)) out.push('T3');
  if (p.triage.T4 === 'yes') out.push('T4');
  if (p.triage.T5 === 'yes') out.push('T5');
  return out;
}

/** Settings as the engine should use them, given the profile (T4 → no retinoid). */
export function effectiveSettings(s: Settings, p: Profile | null): Settings {
  return p?.triage.T4 === 'yes' ? { ...s, retinoidPaused: true } : { ...s, retinoidPaused: false };
}

export type ProfileStatus = 'missing' | 'review' | 'ok';

export function profileStatus(p: Profile | null): ProfileStatus {
  if (!p) return 'missing';
  return p.reviewedAt ? 'ok' : 'review';
}
