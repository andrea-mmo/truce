import { dayIndex, isSummer, previousDow } from './dates';
import type { ActiveClass } from './ingredients';
import { isProductInTrial, isProductOn } from './phases';
import type { Category, ProductStatus, Season } from './products';
import { retinolNights, treatmentFor } from './schedule';
import type { Dow, Phase, PlanState, Treatment } from './types';

/**
 * Builds "Hoy" from the product library. The engine returns product ids and
 * roles; names and how-to texts come from the products themselves.
 */

/** What the routine needs to know about a product. */
export interface RoutineProduct {
  id: number;
  /** productKey(id) */
  key: string;
  category: Category;
  status: ProductStatus;
  am: boolean;
  pm: boolean;
  season: Season;
  order: number;
  actives: ActiveClass[];
  /** Ad-hoc trial (status 'trial'): start date. */
  trialStart?: string;
}

/** D4: each new product is tried alone for 2 weeks. */
export const TRIAL_DAYS = 14;

/** Day of an ad-hoc trial (0-based), or null if not in one. */
export function adhocTrialDay(p: { status: ProductStatus; trialStart?: string }, date: Date): number | null {
  if (p.status !== 'trial' || !p.trialStart) return null;
  const d = dayIndex(p.trialStart, date);
  return d >= 0 ? d : null;
}

export type StepRole = 'product' | 'firstCleanse' | 'secondCleanse' | 'treatment' | 'led';
export type TagLabel = 'trial' | 'glyToday' | 'optional' | 'firstCleanse' | 'nightCream' | 'treatment';

export interface StepTag {
  style: 'new' | 'opt' | Treatment;
  label: TagLabel;
}

export interface Step {
  /** Stable id used to store the check marks. */
  id: string;
  role: StepRole;
  productId?: number;
  tag?: StepTag;
  treatment?: Treatment;
}

export interface RoutineContext {
  phases: Phase[];
  state: PlanState;
  /** Effective week (≥ 1). */
  week: number;
  dow: Dow;
  date: Date;
  products: RoutineProduct[];
}

/** Not part of the daily routine. */
const NOT_DAILY: Category[] = ['mask', 'peel', 'makeup'];
/** Night treatment (step 3) → active class of the product to use. */
export const ROTATION: Record<Treatment, ActiveClass> = { az: 'azelaic', bha: 'bha', ret: 'retinoid' };
const ROTATION_CLASSES = Object.values(ROTATION);

export const TREATMENT_STEP_ID = 'pm_treat';
export const LED_STEP_ID = 'pm_led';

const inQueue = (ctx: RoutineContext, p: RoutineProduct) => ctx.phases.some((ph) => ph.id === p.key);

/** In use today: active, or back from the reset according to the plan. */
export function isInUse(ctx: RoutineContext, p: RoutineProduct): boolean {
  if (p.status === 'removed') return false;
  if (p.status === 'active') return true;
  if (p.status === 'trial') return adhocTrialDay(p, ctx.date) !== null; // started (not in the future)
  return inQueue(ctx, p) && isProductOn(ctx.phases, p.key, ctx.week, ctx.state);
}

function inTrial(ctx: RoutineContext, p: RoutineProduct): boolean {
  if (p.status === 'trial') return adhocTrialDay(p, ctx.date) !== null;
  return p.status !== 'removed' && inQueue(ctx, p) && isProductInTrial(ctx.phases, p.key, ctx.week, ctx.state);
}

function seasonOk(p: RoutineProduct, date: Date): boolean {
  return p.season === 'all' || (p.season === 'summer') === isSummer(date);
}

export function isRotationTreatment(p: RoutineProduct): boolean {
  return p.category === 'treatment' && p.actives.some((a) => ROTATION_CLASSES.includes(a));
}

/** Products coming back from the reset get a tag: "En prueba", then a softer one. */
function tagFor(ctx: RoutineContext, p: RoutineProduct, otherwise: TagLabel): StepTag | undefined {
  if (inTrial(ctx, p)) return { style: 'new', label: 'trial' };
  if (inQueue(ctx, p)) return { style: 'opt', label: otherwise };
  return undefined;
}

const byOrder = (a: RoutineProduct, b: RoutineProduct) => a.order - b.order || a.id - b.id;

/** One cream per moment: a product back from the reset wins, then a seasonal one, then order. */
function pickOne(ctx: RoutineContext, list: RoutineProduct[]): RoutineProduct | undefined {
  return [...list].sort((a, b) =>
    Number(inQueue(ctx, b)) - Number(inQueue(ctx, a)) ||
    Number(b.season !== 'all') - Number(a.season !== 'all') ||
    byOrder(a, b))[0];
}

function available(ctx: RoutineContext, moment: 'am' | 'pm'): RoutineProduct[] {
  return ctx.products.filter((p) =>
    p[moment] && isInUse(ctx, p) && seasonOk(p, ctx.date) && !NOT_DAILY.includes(p.category) && !isRotationTreatment(p));
}

export function buildMorning(ctx: RoutineContext): Step[] {
  const { state, week, dow } = ctx;
  const afterRetinol = retinolNights(state.settings, week).includes(previousDow(dow));
  const exfoliantMorning = state.settings.gly.includes(dow) && !afterRetinol;

  let list = available(ctx, 'am')
    // AHA in the morning: only on the chosen mornings, never after a retinol night.
    .filter((p) => !p.actives.includes('aha') || exfoliantMorning);
  const creams = list.filter((p) => p.category === 'moisturizer');
  const cream = pickOne(ctx, creams);
  list = list.filter((p) => p.category !== 'moisturizer' || p === cream).sort(byOrder);

  return list.map((p) => ({
    id: `am:${p.key}`,
    role: 'product' as const,
    productId: p.id,
    tag: tagFor(ctx, p, p.actives.includes('aha') ? 'glyToday' : 'optional'),
  }));
}

export function buildEvening(ctx: RoutineContext): Step[] {
  const { state, week, dow } = ctx;
  const list = available(ctx, 'pm');
  const steps: Step[] = [];

  // Double cleanse: oil cleanser + cleanser, or the cleanser twice.
  const oil = list.filter((p) => p.category === 'oil-cleanser').sort(byOrder)[0];
  const cleanser = list.filter((p) => p.category === 'cleanser').sort(byOrder)[0];
  if (oil) steps.push({ id: `pm1:${oil.key}`, role: 'firstCleanse', productId: oil.id, tag: tagFor(ctx, oil, 'firstCleanse') });
  else if (cleanser) steps.push({ id: `pm1:${cleanser.key}`, role: 'firstCleanse', productId: cleanser.id });
  if (cleanser) steps.push({ id: `pm2:${cleanser.key}`, role: 'secondCleanse', productId: cleanser.id });

  // R11: the LED mask goes on clean, dry skin, before any serum or cream.
  steps.push({ id: LED_STEP_ID, role: 'led' });

  // Toners and serums at night, if any.
  for (const p of list.filter((x) => x.category === 'toner' || x.category === 'serum').sort(byOrder)) {
    steps.push({ id: `pm:${p.key}`, role: 'product', productId: p.id, tag: tagFor(ctx, p, 'optional') });
  }

  // Step 3: tonight's treatment, from the weekly calendar.
  const t = treatmentFor(state.settings, dow, week);
  const treat = ctx.products
    .filter((p) => isRotationTreatment(p) && isInUse(ctx, p) && p.actives.includes(ROTATION[t]))
    .sort(byOrder)[0];
  steps.push({ id: TREATMENT_STEP_ID, role: 'treatment', productId: treat?.id, treatment: t, tag: { style: t, label: 'treatment' } });

  const cream = pickOne(ctx, list.filter((p) => p.category === 'moisturizer'));
  if (cream) steps.push({ id: `pm:${cream.key}`, role: 'product', productId: cream.id, tag: tagFor(ctx, cream, 'nightCream') });

  return steps;
}
