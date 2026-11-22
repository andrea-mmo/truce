/**
 * Test fixtures: the invented demo case (docs/demo-case.md) as the engine
 * sees it, with the statuses after the reset. Used only by tests.
 */
import db from '../data/ingredients.json';
import { DEMO_PRODUCTS } from '../data/demo-case';
import { buildIndex, type IngredientDb } from './ingredients';
import { productKey, readProduct, toRoutineProduct, type Product } from './products';
import type { RoutineProduct } from './routine';

export const index = buildIndex(db as IngredientDb);

export const adaProducts: (Product & { id: number })[] =
  DEMO_PRODUCTS.map((p, i) => ({ ...p, id: i + 1, createdAt: 0, updatedAt: 0 }));

export const adaRoutine: RoutineProduct[] =
  adaProducts.map((p) => toRoutineProduct(p, readProduct(p, index)));

/** Product by brand + start of name. */
export function prod(brand: string, start: string) {
  const p = adaProducts.find((x) => x.brand === brand && x.name.startsWith(start));
  if (!p) throw new Error(`No product ${brand} ${start}`);
  return p;
}
export const key = (brand: string, start: string) => productKey(prod(brand, start).id);

export const CBOOST = key('Norra', 'C-Boost');
export const TONIC = key('Norra', 'Glow Tonic');
export const BALM = key('Fernwell', 'Melting');
export const NIGHT = key('Norra', 'Rich Repair');
/** Reintroduction order the engine proposes for the case (expected result 9). */
export const ADA_QUEUE = [CBOOST, TONIC, BALM, NIGHT];

/** "Brand Name" for readable assertions. */
export const label = (id?: number) => {
  const p = adaProducts.find((x) => x.id === id);
  return p ? `${p.brand} ${p.name}` : '—';
};

export function baseProduct(over: Partial<Product>): Product {
  return {
    name: 'X', brand: 'Y', category: 'serum', inciText: '', ingredientsConfirmed: false, declaredActives: [],
    usesPerWeek: null, status: 'active', am: true, pm: false, season: 'all', order: 50, howTo: '',
    createdAt: 0, updatedAt: 0, ...over,
  };
}
