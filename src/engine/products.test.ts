import db from '../data/ingredients.json';
import { buildIndex, readProduct, type IngredientDb, type Product } from './index';

const index = buildIndex(db as IngredientDb);
const product = (over: Partial<Product>): Product => ({
  name: 'X', brand: 'Y', category: 'serum', inciText: '', ingredientsConfirmed: false,
  declaredActives: [], usesPerWeek: null, status: 'active', am: true, pm: false, season: 'all', order: 50, howTo: '', createdAt: 0, updatedAt: 0, ...over,
});

describe('readProduct', () => {
  it('no INCI: only declared actives', () => {
    const r = readProduct(product({ declaredActives: ['bha'] }), index);
    expect(r.hasInci).toBe(false);
    expect(r.actives).toEqual([{ activeClass: 'bha', origin: 'declared', from: [] }]);
  });

  it('actives come from the INCI, with the ingredient that triggers them', () => {
    const r = readProduct(product({ inciText: 'Aqua, Niacinamide, Trisodium Ascorbyl Palmitate Phosphate, Glycerin' }), index);
    expect(r.actives).toEqual([
      { activeClass: 'niacinamide', origin: 'inci', from: ['NIACINAMIDE'] },
      { activeClass: 'vitC', origin: 'inci', from: ['TRISODIUM ASCORBYL PALMITATE PHOSPHATE'] },
    ]);
  });

  it('INCI wins over a declared active of the same class; other declared ones stay', () => {
    const r = readProduct(product({ inciText: 'Aqua, Salicylic Acid', declaredActives: ['bha', 'aha'] }), index);
    expect(r.actives.map((a) => [a.activeClass, a.origin])).toEqual([['bha', 'inci'], ['aha', 'declared']]);
  });

  it('unknown ingredients are listed, not guessed', () => {
    const r = readProduct(product({ inciText: 'Aqua, Houttuynia Cordata Extract' }), index);
    expect(r.unknown.map((u) => u.raw)).toEqual(['Houttuynia Cordata Extract']);
  });
});
