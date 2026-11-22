import db from '../data/ingredients.json';
import { analyze, buildIndex, readProduct, uncertaintyPoints, type IngredientDb, type Product } from './index';

const index = buildIndex(db as IngredientDb);
const a = (over: Partial<Product>) => {
  const p: Product = { name: 'X', brand: 'Y', category: 'serum', inciText: '', ingredientsConfirmed: false, declaredActives: [], usesPerWeek: null, status: 'paused', am: true, pm: false, season: 'all', order: 50, howTo: '', createdAt: 0, updatedAt: 0, ...over };
  return analyze(p, readProduct(p, index));
};

describe('D6 · uncertainty', () => {
  it('cream/serum-type without INCI → +3', () => {
    for (const category of ['serum', 'moisturizer', 'spf', 'makeup'] as const) expect(uncertaintyPoints(a({ category }))).toBe(3);
  });
  it('toners, treatments and cleansers without INCI → 0', () => {
    for (const category of ['toner', 'treatment', 'cleanser', 'oil-cleanser', 'mask', 'peel'] as const) expect(uncertaintyPoints(a({ category }))).toBe(0);
  });
  it('with INCI → 0', () => {
    expect(uncertaintyPoints(a({ inciText: 'Aqua, Glycerin' }))).toBe(0);
  });
});
