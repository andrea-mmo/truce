/**
 * Every language has the same texts as Spanish (the reference), nothing is
 * left untranslated, and rule sources stay the same across languages.
 * Also renders the demo case (docs/demo-case.md) in every language.
 */
import db from '../data/ingredients.json';
import { DEMO_PRODUCTS, DEMO_TRIAGE } from '../data/demo-case';
import {
  analyze, analyzeRoutine, buildIndex, proposeReset, readProduct,
  type Analyzed, type ChallengeWarning, type FitIssue, type IngredientDb, type Product, type Tip, type TipId,
} from '../engine';
import { es } from './es';
import { fmtNum } from './format';
import { MESSAGES } from './index';
import { detectLang, setLang, type Lang } from './lang';

const OTHERS = (Object.keys(MESSAGES) as Lang[]).filter((l) => l !== 'es');
const SPANISH_ONLY = /[áéíóúñ¿¡]/i;

type Leaf = { path: string; value: unknown };
function leaves(x: unknown, path = ''): Leaf[] {
  if (x && typeof x === 'object') {
    return Object.entries(x).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [{ path, value: x }];
}
const kind = (v: unknown) => (Array.isArray(v) ? 'array' : typeof v);

/** Rule ids (R4, D6, T1…) and doc names a source cites; must not change with the language. */
const citations = (s: string) => (s.match(/\b[A-Z]\d+\b|[\w-]+\.md|\d+\.\d+/g) ?? []).sort();

// The demo case's products, as in demo-case.test.ts.
const index = buildIndex(db as IngredientDb);
const products: Product[] = DEMO_PRODUCTS.map((p, i) => ({ ...p, id: i + 1, status: 'active', createdAt: 0, updatedAt: 0 }));
const items: Analyzed[] = products.map((p) => analyze(p, readProduct(p, index)));
const nameOf = (id: number) => products.find((p) => p.id === id)!.name;

afterEach(() => setLang('es', false));

describe.each(OTHERS)('%s has the same texts as Spanish', (lang) => {
  const other = MESSAGES[lang];
  const esLeaves = leaves(es);
  const otherLeaves = new Map(leaves(other).map((l) => [l.path, l.value]));

  it('same keys, same kinds of value', () => {
    expect([...otherLeaves.keys()].sort()).toEqual(esLeaves.map((l) => l.path).sort());
    for (const l of esLeaves) expect(`${l.path}: ${kind(otherLeaves.get(l.path))}`).toBe(`${l.path}: ${kind(l.value)}`);
  });

  it('no empty texts (unless empty in Spanish too) and nothing left in Spanish', () => {
    for (const l of esLeaves) {
      const v = otherLeaves.get(l.path);
      if (typeof v !== 'string') continue;
      expect(`${l.path}: ${v === '' ? 'empty' : 'ok'}`).toBe(`${l.path}: ${l.value === '' ? 'empty' : 'ok'}`);
      expect(`${l.path}: ${v}`).not.toMatch(SPANISH_ONLY);
    }
  });

  it('sources cite the same rules and docs', () => {
    for (const id of Object.keys(es.tips) as TipId[]) expect(citations(other.tips[id].source)).toEqual(citations(es.tips[id].source));
    for (const [id, v] of Object.entries(es.analysis.product)) {
      expect(citations(other.analysis.product[id as keyof typeof es.analysis.product].source)).toEqual(citations(v.source));
    }
  });

  it('dynamic texts (findings, fit, tips, goal warnings) are filled in and translated', () => {
    setLang(lang, false);
    const routine = analyzeRoutine(items);
    expect(routine.length).toBeGreaterThan(0);
    for (const f of routine) {
      setLang('es', false);
      const a = es.analysis.routine(f, nameOf);
      setLang(lang, false);
      const b = other.analysis.routine(f, nameOf);
      expect(citations(b.source)).toEqual(citations(a.source));
      for (const s of [b.title, b.body]) {
        expect(s).not.toMatch(/undefined|NaN/);
        // Product names may carry accents; strip them before the check.
        expect(products.reduce((acc, p) => acc.split(p.name).join(''), s)).not.toMatch(SPANISH_ONLY);
      }
    }
    const fits: FitIssue[] = [
      { ruleId: 'R7', activeClass: 'bha', withIds: [1] }, { ruleId: 'VITC-DUP', withIds: [1] },
      { ruleId: 'R4', before: 6.5, after: 9 }, { ruleId: 'R3', withIds: [1] }, { ruleId: 'R5' },
    ];
    const warnings: ChallengeWarning[] = [
      { kind: 'noNewProducts', ruleId: 'D4+D5' },
      { kind: 'trialClash', ruleId: 'D4+D5', trial: 'p1', trialStart: '2026-12-01', trialEnd: '2026-12-14' },
    ];
    const tip: Tip = { id: 'trialFocus', ruleId: 'D4', severity: 'info', trial: { id: 'p1', day: 3, of: 14 } };
    const texts = [
      ...fits.map((f) => other.fit(f, () => 'X')),
      ...warnings.map((w) => other.challenge.warning(w, () => 'X', (d) => d)),
    ].flatMap((x) => [x.title, x.body]);
    texts.push(...(Object.keys(other.tips) as TipId[]).map((id) => other.tips[id].body(tip, () => 'X')));
    for (const s of texts) {
      expect(s).not.toMatch(/undefined|NaN/);
      expect(s).not.toMatch(SPANISH_ONLY);
    }
  });

  it('demo case: triage, reset proposal and product notes render', () => {
    for (const id of DEMO_TRIAGE) expect(other.triage[id]).toBeTruthy();
    const reset = proposeReset(items);
    for (const p of reset.pause) expect(other.analysis.pauseReason[p.reason]).toBeTruthy();
    for (const a of items) for (const f of a.findings) expect(other.analysis.product[f.ruleId].title).toBeTruthy();
  });
});

describe('language detection', () => {
  it('picks the first supported device language', () => {
    expect(detectLang(['en-GB', 'es-ES'])).toBe('en');
    expect(detectLang(['es-MX'])).toBe('es');
    expect(detectLang(['fr-FR', 'en-US'])).toBe('en');
  });
  it('falls back to Spanish', () => {
    expect(detectLang(['fr-FR', 'de'])).toBe('es');
    expect(detectLang([])).toBe('es');
  });
});

describe('numbers follow the language', () => {
  it('decimal comma in Spanish, point in English', () => {
    setLang('es', false);
    expect(fmtNum(2.5)).toBe('2,5');
    setLang('en', false);
    expect(fmtNum(2.5)).toBe('2.5');
    expect(fmtNum(12)).toBe('12');
  });
});
