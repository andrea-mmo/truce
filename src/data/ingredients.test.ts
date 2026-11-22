/** Guards CLAUDE.md principle 3: every ingredient fact has a source. */
import db from './ingredients.json';
import { buildIndex, normalizeName, type IngredientDb } from '../engine';

const data = db as IngredientDb;

describe('ingredients.json', () => {
  it('has attribution for CosIng', () => {
    expect(data.attribution).toMatch(/CosIng/);
  });

  it.each(data.ingredients.map((i) => [i.inci, i]))('%s: verified in CosIng', (_n, ing) => {
    const cosing = ing.source.find((s) => s.kind === 'cosing');
    expect(cosing?.ref).toBe(ing.cosing.url);
    expect(ing.cosing.url).toMatch(/^https:\/\/ec\.europa\.eu\/growth\/tools-databases\/cosing\/details\/\d+$/);
    expect(ing.cosing.functions.length).toBeGreaterThan(0);
  });

  it('any engine classification carries its own source', () => {
    for (const ing of data.ingredients) {
      const classified =
        ing.activeClass !== 'none' || ing.exfoliationWeight > 0 || ing.watch !== null || ing.richEmollient ||
        ing.filmFormer || ing.fragrance || ing.dryingAlcohol || ing.preservativeMarker ||
        ing.irritancy !== 'low' || ing.photosensitizing || ing.pregnancyCaution;
      if (classified) {
        expect(ing.source.some((s) => s.covers.includes('classification')), ing.inci).toBe(true);
      }
    }
  });

  it('names and aliases are unique', () => {
    const seen = new Map<string, string>();
    for (const ing of data.ingredients) {
      for (const n of [ing.inci, ...ing.aliases]) {
        const k = normalizeName(n);
        expect(seen.get(k), `${n} used by ${seen.get(k)} and ${ing.inci}`).toBeUndefined();
        seen.set(k, ing.inci);
      }
    }
    expect(buildIndex(data).size).toBe(seen.size);
  });
});
