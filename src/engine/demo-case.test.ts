/**
 * The invented demo case (docs/demo-case.md) against its expected results.
 * The public demo starts from this data, so it must keep showing every rule.
 */
import db from '../data/ingredients.json';
import { DEMO_PRODUCTS, DEMO_TRIAGE, demoProfile } from '../data/demo-case';
import {
  analyze, analyzeRoutine, buildIndex, proposeReset, readProduct, R4_REDUCE, triageFromProfile,
  type Analyzed, type IngredientDb, type Product, type ProductRuleId,
} from './index';

const index = buildIndex(db as IngredientDb);
// Before the reset everything is in use.
const products: Product[] = DEMO_PRODUCTS.map((p, i) => ({ ...p, id: i + 1, status: 'active', createdAt: 0, updatedAt: 0 }));
const items: Analyzed[] = products.map((p) => analyze(p, readProduct(p, index)));
const nameOf = (id: number) => products[id - 1].name;
const names = (ids: number[]) => ids.map(nameOf).sort();
const rulesOf = (name: string) => items.find((a) => a.product.name === name)!.findings.map((f) => f.ruleId).sort();
const routine = analyzeRoutine(items);
const find = <R extends string>(id: R) => routine.filter((f) => f.ruleId === id);
const reset = proposeReset(items);

describe('demo case (Ada)', () => {
  it('1 · triage: marks that stay (T2) → professional alert, from the profile too', () => {
    expect(DEMO_TRIAGE).toEqual(['T2']);
    expect(triageFromProfile(demoProfile())).toEqual(['T2']);
  });

  it('every ingredient is known: the demo shows a complete reading', () => {
    for (const a of items) expect(`${a.product.name}: ${a.reading.unknown.length}`).toBe(`${a.product.name}: 0`);
  });

  it('2 · R4: weekly exfoliation load far above the threshold', () => {
    const [r4] = find('R4');
    expect(r4 && r4.ruleId === 'R4' && r4.load).toBeGreaterThan(R4_REDUCE);
  });

  it('3 · R7: BHA repeated (wash, liquid, peel) and AHA repeated (tonic, peel)', () => {
    const r7 = find('R7').map((f) => (f.ruleId === 'R7' ? `${f.activeClass}: ${names(f.productIds).join(', ')}` : ''));
    expect(r7.sort()).toEqual([
      'aha: Exfoliating Peel 25%, Glow Tonic 5% Glycolic',
      'bha: BHA Pore Liquid 2%, Clarifying Salicylic Wash, Exfoliating Peel 25%',
    ]);
  });

  it('4 · vitamin C in two serums', () => {
    const [v] = find('VITC-DUP');
    expect(v && 'productIds' in v && names(v.productIds)).toEqual(['Bright C 15% Serum', 'C-Boost Drops']);
  });

  it('5 · R5: acids and retinol with no sunscreen', () => {
    expect(products.some((p) => p.category === 'spf')).toBe(false);
    const [r5] = find('R5');
    expect(r5?.severity).toBe('stop');
  });

  it('6 · R3: benzoyl peroxide and retinol', () => {
    const [r3] = find('R3');
    expect(r3 && 'productIds' in r3 && names(r3.productIds)).toEqual(['Retinol 0.3% Night Serum', 'Spot Gel 5% Benzoyl Peroxide']);
  });

  it('7 · product notes: C1–C5, fragrance and alcohol', () => {
    const expected: Record<string, ProductRuleId[]> = {
      'Melting Cleansing Balm': ['C1', 'C4', 'FRAGRANCE'],
      'Rich Repair Night Cream': ['C1', 'C2', 'C3'],
      'Second Skin Foundation': ['ALCOHOL', 'C5'],
      'Glow Tonic 5% Glycolic': ['ALCOHOL'],
      'Clarifying Salicylic Wash': ['FRAGRANCE'],
    };
    for (const [name, rules] of Object.entries(expected)) expect(`${name}: ${rulesOf(name)}`).toBe(`${name}: ${[...rules].sort()}`);
  });

  it('8 · reset: pauses comedone risks, extra exfoliants and the second vitamin C', () => {
    expect(reset.pause.map((p) => `${nameOf(p.id)}: ${p.reason}`).sort()).toEqual([
      'C-Boost Drops: duplicate-vitc',
      'Clarifying Salicylic Wash: exfoliation',
      'Exfoliating Peel 25%: exfoliation',
      'Glow Tonic 5% Glycolic: exfoliation',
      'Melting Cleansing Balm: comedones',
      'Rich Repair Night Cream: comedones',
    ]);
    expect(reset.loadAfter).toBeLessThan(R4_REDUCE);
  });

  it('9 · reintroduction order, lowest risk first; repeated exfoliants stay out', () => {
    expect(reset.reintro.map((r) => nameOf(r.id))).toEqual([
      'C-Boost Drops', 'Glow Tonic 5% Glycolic', 'Melting Cleansing Balm', 'Rich Repair Night Cream',
    ]);
    expect(names(reset.notReintroduced)).toEqual(['Clarifying Salicylic Wash', 'Exfoliating Peel 25%']);
  });

  it('the seed statuses match the reset proposal', () => {
    const paused = new Set(reset.pause.map((p) => nameOf(p.id)));
    for (const p of DEMO_PRODUCTS) expect(`${p.name}: ${p.status}`).toBe(`${p.name}: ${paused.has(p.name) ? 'paused' : 'active'}`);
  });
});
