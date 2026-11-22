import { addDays, analyze, buildPhases, parseYmd, readProduct, reviewNewProduct, toYmd, type Product } from './index';
import { ADA_QUEUE, adaProducts, baseProduct, index } from './fixtures';

const inUse = adaProducts.filter((p) => p.status === 'active').map((p) => analyze(p, readProduct(p, index)));
const phases = buildPhases(ADA_QUEUE); // reset 1–6, trials up to week 14
const START = parseYmd('2026-11-16');
const ctxAt = (week: number, over = {}) => ({
  inUse, phases, week, today: addDays(START, (Math.max(week, 1) - 1) * 7), adhocTrials: [], reintro: {}, ...over,
});
const make = (over: Partial<Product>) => ({ ...baseProduct(over), id: 999 }) as Product & { id: number };
const review = (p: Product & { id: number }, week: number, over = {}) => reviewNewProduct(p, readProduct(p, index), ctxAt(week, over));

describe('new product review', () => {
  it('reports what it sees and what it can\'t know', () => {
    const r = review(make({ category: 'moisturizer', inciText: 'Aqua, Ethylhexyl Palmitate, Glycerin, Houttuynia Cordata Extract, Mystery Peptide-99' }), 2);
    expect(r.findings.map((f) => f.ruleId)).toContain('C1');
    expect(r.total).toBe(5);
    expect(r.unknown).toEqual(["Houttuynia Cordata Extract", "Mystery Peptide-99"]);
  });

  it('fit: a second BHA repeats R7 and raises the weekly load', () => {
    const r = review(make({ category: 'toner', declaredActives: ['bha'], usesPerWeek: 4 }), 2);
    expect(r.fit).toContainEqual(expect.objectContaining({ ruleId: 'R7', activeClass: 'bha' }));
    expect(r.fit.some((f) => f.ruleId === 'R4')).toBe(true); // 6 (BHA liquid) + 8 → 14
  });

  it('fit: another vitamin C serum duplicates Bright C', () => {
    const r = review(make({ category: 'serum', declaredActives: ['vitC'] }), 2);
    expect(r.fit).toContainEqual(expect.objectContaining({ ruleId: 'VITC-DUP' }));
  });

  it('an exfoliant without uses per week asks for it', () => {
    expect(review(make({ declaredActives: ['aha'], usesPerWeek: null }), 2).needsUses).toBe(true);
    expect(review(make({ declaredActives: ['niacinamide'] }), 2).needsUses).toBe(false);
  });

  it('during the reset or the reintroduction: joins the queue after week 14', () => {
    expect(review(make({}), 2).introduce).toEqual({ kind: 'queue', startsWeek: 15, weeksFromNow: 13 });
    expect(review(make({}), 10).introduce).toEqual({ kind: 'queue', startsWeek: 15, weeksFromNow: 5 });
    expect(review(make({}), 0).introduce).toMatchObject({ kind: 'queue', startsWeek: 15 });
  });

  it('after the plan: trial now, or wait if another trial is running; makeup needs none', () => {
    expect(review(make({}), 16).introduce).toEqual({ kind: 'trial-now' });
    const today = addDays(START, 15 * 7);
    const busy = review(make({}), 16, { adhocTrials: [{ key: 'p50', start: toYmd(addDays(today, -3)) }] }).introduce;
    expect(busy).toEqual({ kind: 'busy', trialKey: 'p50', endsOn: toYmd(addDays(today, 11)) });
    expect(review(make({ category: 'makeup' }), 16).introduce).toEqual({ kind: 'none' });
  });
});

describe('ad-hoc trials in the routine', () => {
  it('a product in trial shows in Hoy with "En prueba" for 14 days', async () => {
    const { buildMorning } = await import('./index');
    const { adaRoutine } = await import('./fixtures');
    const trialP = { id: 999, key: 'p999', category: 'serum' as const, status: 'trial' as const, am: true, pm: false, season: 'all' as const, order: 55, actives: [], trialStart: '2027-03-01' };
    const st = { settings: { start: '2026-11-16', climb: [2, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[], ret: null, gly: [3, 0] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] }, reintro: {}, resetVerdict: null };
    const at = (d: string) => buildMorning({ phases, state: st, week: 20, dow: 1, date: parseYmd(d), products: [...adaRoutine, trialP] }).find((s) => s.productId === 999);
    expect(at('2027-02-28')).toBeUndefined(); // not started
    expect(at('2027-03-01')?.tag).toEqual({ style: 'new', label: 'trial' });
    expect(at('2027-03-20')?.tag).toEqual({ style: 'new', label: 'trial' }); // still trial until answered
  });
});
