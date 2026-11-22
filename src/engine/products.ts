import { parseInci, type ActiveClass, type IngredientIndex, type ParsedIngredient } from './ingredients';
import type { RoutineProduct } from './routine';

export type Category =
  | 'cleanser' | 'oil-cleanser' | 'toner' | 'serum' | 'moisturizer'
  | 'spf' | 'treatment' | 'mask' | 'peel' | 'makeup';

export const CATEGORIES: Category[] = [
  'oil-cleanser', 'cleanser', 'toner', 'serum', 'treatment', 'moisturizer', 'spf', 'mask', 'peel', 'makeup',
];

export type ProductStatus = 'active' | 'paused' | 'trial' | 'removed';
export type Season = 'all' | 'summer' | 'winter';

/** Default position in the routine by type (lower = earlier). */
export const CATEGORY_ORDER: Record<Category, number> = {
  'oil-cleanser': 5, cleanser: 10, toner: 30, serum: 50, treatment: 100, moisturizer: 80, spf: 90, mask: 110, peel: 110, makeup: 120,
};

/** Stable key used for a product in the plan and in check marks. */
export const productKey = (id: number) => `p${id}`;

export interface Product {
  id?: number;
  name: string;
  brand: string;
  category: Category;
  /** Start (YYYY-MM-DD) of a 2-week trial for a product added outside the reset plan (D4). */
  trialStart?: string;
  /** Barcode (EAN/UPC), when looked up in Open Beauty Facts. */
  barcode?: string;
  /** Ingredient list as pasted or read from the label. '' = still missing. */
  inciText: string;
  /** The person checked the list against the label (SPEC §4). */
  ingredientsConfirmed: boolean;
  /** Actives the person says it has, while the INCI is missing or incomplete. */
  declaredActives: ActiveClass[];
  /** How many times a week it's used (before the reset). null = not set. */
  usesPerWeek: number | null;
  status: ProductStatus;
  /** When it's used. */
  am: boolean;
  pm: boolean;
  /** Only in summer / only outside summer / all year. */
  season: Season;
  /** Position in the routine (lower = earlier). */
  order: number;
  /** Short how-to shown under the name in "Hoy". */
  howTo: string;
  createdAt: number;
  updatedAt: number;
}

export type ActiveOrigin = 'inci' | 'declared';

export interface ProductActive {
  activeClass: ActiveClass;
  origin: ActiveOrigin;
  /** INCI names that gave this class (empty when declared). */
  from: string[];
}

export interface ProductReading {
  parsed: ParsedIngredient[];
  unknown: ParsedIngredient[];
  actives: ProductActive[];
  hasInci: boolean;
}

/**
 * Actives from the INCI win; a declared active is kept only when the INCI
 * doesn't show it (e.g. the list is missing or incomplete).
 */
export function readProduct(p: Product, index: IngredientIndex): ProductReading {
  const parsed = p.inciText.trim() ? parseInci(p.inciText, index) : [];
  const byClass = new Map<ActiveClass, ProductActive>();
  for (const x of parsed) {
    const cls = x.ingredient?.activeClass;
    if (!cls || cls === 'none') continue;
    const cur = byClass.get(cls) ?? { activeClass: cls, origin: 'inci' as const, from: [] };
    cur.from.push(x.ingredient!.inci);
    byClass.set(cls, cur);
  }
  for (const cls of p.declaredActives) {
    if (cls !== 'none' && !byClass.has(cls)) byClass.set(cls, { activeClass: cls, origin: 'declared', from: [] });
  }
  return {
    parsed,
    unknown: parsed.filter((x) => !x.ingredient),
    actives: [...byClass.values()],
    hasInci: parsed.length > 0,
  };
}

const AM_DEFAULT: Category[] = ['cleanser', 'toner', 'serum', 'moisturizer', 'spf'];
const PM_DEFAULT: Category[] = ['oil-cleanser', 'cleanser', 'treatment', 'moisturizer', 'mask', 'peel'];

/** Sensible routine fields for a new product of this type. */
export function routineDefaults(category: Category): Pick<Product, 'am' | 'pm' | 'season' | 'order' | 'howTo'> {
  return { am: AM_DEFAULT.includes(category), pm: PM_DEFAULT.includes(category), season: 'all', order: CATEGORY_ORDER[category], howTo: '' };
}

export function toRoutineProduct(p: Product & { id: number }, r: ProductReading): RoutineProduct {
  return {
    id: p.id, key: productKey(p.id), category: p.category, status: p.status,
    am: p.am, pm: p.pm, season: p.season, order: p.order, actives: r.actives.map((a) => a.activeClass),
    trialStart: p.trialStart,
  };
}
