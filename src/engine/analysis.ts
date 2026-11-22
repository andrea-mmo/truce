/**
 * Product and routine analysis (docs/REGLAS.md B, C, D). Deterministic.
 * Returns rule ids and data; the words live in src/i18n (es.ts, en.ts).
 */
import type { ActiveClass, ParsedIngredient } from './ingredients';
import type { Category, Product, ProductReading } from './products';

export type Severity = 'info' | 'warn' | 'stop';

// ---------------------------------------------------------------- product

export type ProductRuleId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'FRAGRANCE' | 'ALCOHOL';

export interface ProductFinding {
  ruleId: ProductRuleId;
  severity: Severity;
  /** INCI names that triggered it. */
  ingredients: string[];
}

/** Products that stay on the skin. Oil cleansers are handled by C1/C4. */
export const LEAVE_ON: Category[] = ['toner', 'serum', 'treatment', 'moisturizer', 'spf', 'makeup'];
/** "Los 5 primeros ingredientes pesan más" (REGLAS C). */
export const TOP_POSITIONS = 5;

/**
 * Ingredients that weigh more: within the first 5 and before a preservative
 * marker such as phenoxyethanol (REGLAS C, peso por posición).
 */
export function topIngredients(parsed: ParsedIngredient[]): ParsedIngredient[] {
  const marker = parsed.find((x) => x.ingredient?.preservativeMarker)?.position ?? Infinity;
  return parsed.filter((x) => x.position <= TOP_POSITIONS && x.position < marker);
}

const names = (xs: ParsedIngredient[]) => xs.map((x) => x.ingredient!.inci);

export function analyzeProduct(p: Product, r: ProductReading): ProductFinding[] {
  const out: ProductFinding[] = [];
  const top = topIngredients(r.parsed);
  const leaveOn = LEAVE_ON.includes(p.category);
  const known = r.parsed.filter((x) => x.ingredient);

  // C1: rich fatty esters among the first ingredients (leave-on or oil cleanser).
  const c1 = top.filter((x) => x.ingredient?.watch === 'C1');
  if (c1.length && (leaveOn || p.category === 'oil-cleanser')) out.push({ ruleId: 'C1', severity: 'warn', ingredients: names(c1) });

  // C2: heavy plant oils in the first 5 of a cream left on overnight.
  const c2 = top.filter((x) => x.ingredient?.watch === 'C2');
  if (c2.length && p.category === 'moisturizer') out.push({ ruleId: 'C2', severity: 'warn', ingredients: names(c2) });

  // C3: free fatty acids together with rich emollients in a cream.
  const c3 = known.filter((x) => x.ingredient!.watch === 'C3');
  const rich = known.filter((x) => x.ingredient!.richEmollient);
  if (c3.length && rich.length && p.category === 'moisturizer') {
    out.push({ ruleId: 'C3', severity: 'warn', ingredients: [...names(c3), ...names(rich)] });
  }

  // C4: oil cleanser → always emulsify with water.
  if (p.category === 'oil-cleanser') out.push({ ruleId: 'C4', severity: 'info', ingredients: [] });

  // C5: makeup → double cleanse on make-up days (film formers if we can see them).
  if (p.category === 'makeup') {
    out.push({ ruleId: 'C5', severity: 'info', ingredients: names(known.filter((x) => x.ingredient!.filmFormer)) });
  }

  // SPEC §3.3: fragrance anywhere; drying alcohol among the first ingredients.
  const frag = known.filter((x) => x.ingredient!.fragrance);
  if (frag.length) out.push({ ruleId: 'FRAGRANCE', severity: 'info', ingredients: names(frag) });
  const alc = top.filter((x) => x.ingredient?.dryingAlcohol);
  if (alc.length && leaveOn) out.push({ ruleId: 'ALCOHOL', severity: 'info', ingredients: names(alc) });

  return out;
}

/** Exfoliant classes counted by R4/R7. */
export const EXFOLIANTS: ActiveClass[] = ['aha', 'bha', 'pha'];
/** Weight used when an exfoliant is declared but the INCI is missing. */
export const DECLARED_EXFOLIATION_WEIGHT: Partial<Record<ActiveClass, number>> = { aha: 2, bha: 2, pha: 1 };
/** Peels are the strongest exfoliation step (weight scale 0–3). */
export const PEEL_WEIGHT = 3;

export function exfoliationWeight(p: Product, r: ProductReading): number {
  if (p.category === 'peel' && r.actives.some((a) => EXFOLIANTS.includes(a.activeClass))) return PEEL_WEIGHT;
  const fromInci = Math.max(0, ...r.parsed.map((x) => x.ingredient?.exfoliationWeight ?? 0));
  const declared = Math.max(0, ...r.actives.filter((a) => a.origin === 'declared').map((a) => DECLARED_EXFOLIATION_WEIGHT[a.activeClass] ?? 0));
  return Math.max(fromInci, declared);
}

/** Comedone score for D4: C1 4, C2 3, C3 2, C4 1. */
const C_POINTS: Partial<Record<ProductRuleId, number>> = { C1: 4, C2: 3, C3: 2, C4: 1 };

export function comedoneScore(findings: ProductFinding[]): number {
  return findings.reduce((s, f) => s + (C_POINTS[f.ruleId] ?? 0), 0);
}

// ---------------------------------------------------------------- routine

export interface Analyzed {
  product: Product;
  reading: ProductReading;
  findings: ProductFinding[];
  exfoliation: number;
}

export function analyze(p: Product, r: ProductReading): Analyzed {
  return { product: p, reading: r, findings: analyzeProduct(p, r), exfoliation: exfoliationWeight(p, r) };
}

/** R4 thresholds (weight × uses per week). */
export const R4_WARN = 8;
export const R4_REDUCE = 12;

export type RoutineFinding =
  | { ruleId: 'R4'; severity: Severity; load: number; contributions: { id: number; load: number }[] }
  | { ruleId: 'R7'; severity: Severity; activeClass: ActiveClass; productIds: number[] }
  | { ruleId: 'VITC-DUP'; severity: Severity; productIds: number[] }
  | { ruleId: 'R5'; severity: Severity; productIds: number[] }
  | { ruleId: 'R3'; severity: Severity; productIds: number[] };

const id = (a: Analyzed) => a.product.id ?? -1;
const has = (a: Analyzed, cls: ActiveClass) => a.reading.actives.some((x) => x.activeClass === cls);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function exfoliationLoad(items: Analyzed[]): { load: number; contributions: { id: number; load: number }[] } {
  const contributions = items
    .map((a) => ({ id: id(a), load: round1(a.exfoliation * (a.product.usesPerWeek ?? 0)) }))
    .filter((c) => c.load > 0)
    .sort((a, b) => b.load - a.load);
  return { load: round1(contributions.reduce((s, c) => s + c.load, 0)), contributions };
}

/**
 * Vitamin C counts when it's a main ingredient (first 5) or declared:
 * a derivative far down a cream's list is not a "vitamin C product".
 */
export function isVitCProduct(a: Analyzed): boolean {
  const vit = a.reading.actives.find((x) => x.activeClass === 'vitC');
  if (!vit) return false;
  if (vit.origin === 'declared') return true;
  return topIngredients(a.reading.parsed).some((x) => x.ingredient?.activeClass === 'vitC');
}

/** Analysis of a set of products used together (e.g. everything before the reset). */
export function analyzeRoutine(items: Analyzed[]): RoutineFinding[] {
  const out: RoutineFinding[] = [];

  const { load, contributions } = exfoliationLoad(items);
  if (load > R4_WARN) out.push({ ruleId: 'R4', severity: 'warn', load, contributions });

  for (const cls of ['bha', 'aha', 'pha'] as ActiveClass[]) {
    const dup = items.filter((a) => has(a, cls));
    if (dup.length > 1) out.push({ ruleId: 'R7', severity: 'warn', activeClass: cls, productIds: dup.map(id) });
  }

  const vit = items.filter(isVitCProduct);
  if (vit.length > 1) out.push({ ruleId: 'VITC-DUP', severity: 'info', productIds: vit.map(id) });

  const sensitizing = items.filter((a) => has(a, 'aha') || has(a, 'bha') || has(a, 'retinoid'));
  if (sensitizing.length && !items.some((a) => a.product.category === 'spf')) {
    out.push({ ruleId: 'R5', severity: 'stop', productIds: sensitizing.map(id) });
  }

  const bpo = items.filter((a) => has(a, 'bpo'));
  const ret = items.filter((a) => has(a, 'retinoid'));
  if (bpo.length && ret.length) out.push({ ruleId: 'R3', severity: 'warn', productIds: [...bpo, ...ret].map(id) });

  return out.sort((a, b) => sev(b.severity) - sev(a.severity));
}
const sev = (s: Severity) => (s === 'stop' ? 2 : s === 'warn' ? 1 : 0);

// ---------------------------------------------------------------- reset (D1, D2, D4)

export type PauseReason = 'comedones' | 'exfoliation' | 'duplicate-vitc';

export interface ResetProposal {
  pause: { id: number; reason: PauseReason }[];
  keep: number[];
  /** D4: lowest risk first. Paused products worth trying again. */
  reintro: { id: number; risk: number; riskKnown: boolean; uncertainty: number }[];
  /** Paused, not reintroduced: they repeat an exfoliant already kept (R7). */
  notReintroduced: number[];
  loadAfter: number;
}

/**
 * D6: a cream/serum-type leave-on product without INCI can't get a C score,
 * so it counts as medium risk in the D4 order.
 */
export const UNCERTAINTY_CATEGORIES: Category[] = ['serum', 'moisturizer', 'spf', 'makeup'];
export const UNCERTAINTY_POINTS = 3;

export function uncertaintyPoints(a: Analyzed): number {
  return !a.reading.hasInci && UNCERTAINTY_CATEGORIES.includes(a.product.category) ? UNCERTAINTY_POINTS : 0;
}

/** Which exfoliant to keep first: a dedicated treatment, then toners… */
const KEEP_PREFERENCE: Category[] = ['treatment', 'toner', 'serum', 'cleanser', 'mask', 'peel'];

/**
 * D2: pause what triggers C1–C3, exfoliants until the weekly load is under
 * the R4 warning, and duplicated vitamin C products.
 */
export function proposeReset(items: Analyzed[]): ResetProposal {
  const pause = new Map<number, PauseReason>();

  for (const a of items) {
    if (a.findings.some((f) => f.ruleId === 'C1' || f.ruleId === 'C2' || f.ruleId === 'C3')) pause.set(id(a), 'comedones');
  }

  // Exfoliants: keep the preferred one per class, pause the rest, then trim by load.
  const exf = items.filter((a) => a.exfoliation > 0 && !pause.has(id(a)));
  const rank = (a: Analyzed) => KEEP_PREFERENCE.indexOf(a.product.category);
  const keepers = new Set<number>();
  for (const cls of EXFOLIANTS) {
    const withCls = exf.filter((a) => has(a, cls)).sort((a, b) => rank(a) - rank(b));
    if (withCls.length) keepers.add(id(withCls[0]));
  }
  // A product kept for one class but also holding another kept class stays; others pause.
  for (const a of exf) if (!keepers.has(id(a))) pause.set(id(a), 'exfoliation');
  let kept = items.filter((a) => !pause.has(id(a)));
  while (exfoliationLoad(kept).load > R4_WARN) {
    const worst = exfoliationLoad(kept).contributions
      .map((c) => items.find((a) => id(a) === c.id)!)
      .sort((a, b) => rank(b) - rank(a))[0];
    pause.set(id(worst), 'exfoliation');
    kept = items.filter((a) => !pause.has(id(a)));
  }

  // Duplicated vitamin C: keep the one we can read best (INCI known, lowest risk).
  const vit = kept.filter(isVitCProduct).sort((a, b) => Number(b.reading.hasInci) - Number(a.reading.hasInci));
  for (const a of vit.slice(1)) pause.set(id(a), 'duplicate-vitc');
  kept = items.filter((a) => !pause.has(id(a)));

  // D4: reintroduce paused products, except exfoliants repeating a class still in use (R7).
  const keptExf = new Set(kept.flatMap((a) => a.reading.actives.map((x) => x.activeClass)).filter((c) => EXFOLIANTS.includes(c)));
  const paused = items.filter((a) => pause.has(id(a)));
  const redundant = paused.filter((a) => a.reading.actives.some((x) => keptExf.has(x.activeClass)));
  const candidates = paused.filter((a) => !redundant.includes(a));
  const reintro = candidates
    .map((a) => ({
      a,
      id: id(a),
      risk: comedoneScore(a.findings) + a.exfoliation + uncertaintyPoints(a),
      uncertainty: uncertaintyPoints(a),
      riskKnown: a.reading.hasInci || !LEAVE_ON.includes(a.product.category),
      actives: a.reading.actives.length,
    }))
    // Lower risk first; on a tie, products without actives first, then by name.
    .sort((x, y) => x.risk - y.risk || x.actives - y.actives || x.a.product.name.localeCompare(y.a.product.name))
    .map(({ id: i, risk, riskKnown, uncertainty }) => ({ id: i, risk, riskKnown, uncertainty }));

  return {
    pause: [...pause].map(([i, reason]) => ({ id: i, reason })),
    keep: kept.map(id),
    reintro,
    notReintroduced: redundant.map(id),
    loadAfter: exfoliationLoad(kept).load,
  };
}

/** Product keys in D4 order, to freeze as the plan's reintroduction queue. */
export function reintroQueue(proposal: ResetProposal): string[] {
  return proposal.reintro.map((r) => `p${r.id}`);
}
