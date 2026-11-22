/**
 * What to tell the person right after adding a product: what we see in it,
 * what we can't know, how it fits with what she already uses, and how to
 * introduce it (D4: alone, 2 weeks). Pure; texts live in src/content.
 */
import {
  analyze, analyzeProduct, exfoliationLoad, isVitCProduct, R4_WARN, type Analyzed, type ProductFinding,
} from './analysis';
import { dayIndex } from './dates';
import type { ActiveClass } from './ingredients';
import { productKey, type Product, type ProductReading } from './products';
import { TRIAL_DAYS } from './routine';
import type { Phase } from './types';

export type FitIssue =
  | { ruleId: 'R7'; activeClass: ActiveClass; withIds: number[] }
  | { ruleId: 'VITC-DUP'; withIds: number[] }
  | { ruleId: 'R4'; before: number; after: number }
  | { ruleId: 'R3'; withIds: number[] }
  | { ruleId: 'R5' };

export type Introduce =
  /** The reset plan is still running: it joins the reintroduction queue. */
  | { kind: 'queue'; startsWeek: number; weeksFromNow: number }
  /** Nothing else is being tried: start a 2-week trial today. */
  | { kind: 'trial-now' }
  /** Another product is being tried: wait until that one ends. */
  | { kind: 'busy'; trialKey: string; endsOn: string }
  /** Makeup is not part of the daily routine. */
  | { kind: 'none' };

export interface NewProductReview {
  findings: ProductFinding[];
  actives: { activeClass: ActiveClass; declared: boolean }[];
  total: number;
  unknown: string[];
  fit: FitIssue[];
  /** Exfoliant without "veces por semana": the weekly load can't include it. */
  needsUses: boolean;
  introduce: Introduce;
}

export interface ReviewContext {
  /** Products in use now (status active or trial), already analysed. */
  inUse: Analyzed[];
  phases: Phase[];
  /** Raw plan week (0 = not started). */
  week: number;
  today: Date;
  /** Products in an ad-hoc trial: key + start date. */
  adhocTrials: { key: string; start: string }[];
  reintro: Record<string, 'ok' | 'bad'>;
}

const EXF: ActiveClass[] = ['aha', 'bha', 'pha'];
const has = (a: Analyzed, c: ActiveClass) => a.reading.actives.some((x) => x.activeClass === c);

export function reviewNewProduct(p: Product & { id: number }, r: ProductReading, ctx: ReviewContext): NewProductReview {
  const me = analyze(p, r);
  const others = ctx.inUse.filter((a) => a.product.id !== p.id);
  const fit: FitIssue[] = [];

  for (const c of EXF) {
    if (!has(me, c)) continue;
    const dup = others.filter((a) => has(a, c));
    if (dup.length) fit.push({ ruleId: 'R7', activeClass: c, withIds: dup.map((a) => a.product.id!) });
  }
  if (isVitCProduct(me)) {
    const dup = others.filter(isVitCProduct);
    if (dup.length) fit.push({ ruleId: 'VITC-DUP', withIds: dup.map((a) => a.product.id!) });
  }
  const before = exfoliationLoad(others).load;
  const after = exfoliationLoad([...others, me]).load;
  if (after > R4_WARN && after > before) fit.push({ ruleId: 'R4', before, after });
  if (has(me, 'bpo') || has(me, 'retinoid')) {
    const other = others.filter((a) => (has(me, 'bpo') ? has(a, 'retinoid') : has(a, 'bpo')));
    if (other.length) fit.push({ ruleId: 'R3', withIds: other.map((a) => a.product.id!) });
  }
  const sensitizing = has(me, 'aha') || has(me, 'bha') || has(me, 'retinoid');
  if (sensitizing && ![...others, me].some((a) => a.product.category === 'spf')) fit.push({ ruleId: 'R5' });

  return {
    findings: analyzeProduct(p, r),
    actives: r.actives.map((a) => ({ activeClass: a.activeClass, declared: a.origin === 'declared' })),
    total: r.parsed.length,
    unknown: r.unknown.map((u) => u.raw),
    fit,
    needsUses: me.exfoliation > 0 && p.usesPerWeek === null,
    introduce: howToIntroduce(p, ctx),
  };
}

function howToIntroduce(p: Product & { id: number }, ctx: ReviewContext): Introduce {
  if (p.category === 'makeup') return { kind: 'none' };
  const trials = ctx.phases.filter((ph) => ph.id !== 'reset' && ph.id !== 'keep');
  const reset = ctx.phases.find((ph) => ph.id === 'reset');
  const planEnd = trials.length ? Math.max(...trials.map((t) => t.to)) : reset?.to ?? 0;
  // Plan not started or still running (reset or reintroduction): queue it.
  if (ctx.week === 0 || ctx.week <= planEnd) {
    const startsWeek = planEnd + 1;
    return { kind: 'queue', startsWeek, weeksFromNow: Math.max(0, startsWeek - Math.max(ctx.week, 1)) };
  }
  const running = ctx.adhocTrials.find((t) => t.key !== productKey(p.id) && !ctx.reintro[t.key] && dayIndex(t.start, ctx.today) < TRIAL_DAYS);
  if (running) {
    const end = new Date(ctx.today);
    end.setDate(end.getDate() + (TRIAL_DAYS - dayIndex(running.start, ctx.today)));
    return { kind: 'busy', trialKey: running.key, endsOn: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}` };
  }
  return { kind: 'trial-now' };
}
