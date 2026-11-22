import type { Product, Profile, Settings, TriageId } from '../engine';
import { emptyProfile } from '../engine';

/**
 * Demo case (docs/demo-case.md): an invented person, "Ada", with invented
 * brands and products. Used by the public demo instead of real personal data.
 * Ingredient names are real INCI names, so the engine can read them; the
 * products and brands are fictional on purpose (see the doc).
 */

export type SeedProduct = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

/** T2: marks that stay after spots. */
export const DEMO_TRIAGE: TriageId[] = ['T2'];

export function demoSettings(today: string): Settings {
  // No climbing days: the climbing banner is specific to the real case.
  return { start: today, climb: [], ret: null, gly: [] };
}

export function demoProfile(): Profile {
  const p = emptyProfile();
  return {
    ...p,
    name: 'Ada',
    skinType: 'combination',
    concerns: ['comedones', 'redness', 'spots'],
    sportDays: [1, 4],
    makeup: 'weekly',
    salon: 'none',
    breakoutAreas: ['forehead', 'cheeks'],
    hormonalSigns: 'no',
    triage: { ...p.triage, T1: 'no', T2: 'yes', T4: 'skip', T5: 'no' },
  };
}

interface Slot { am?: boolean; pm?: boolean; season?: Product['season']; order: number; howTo: string }

const P = (
  name: string, brand: string, category: Product['category'], inciText: string,
  usesPerWeek: number | null, status: Product['status'], slot: Slot,
): SeedProduct => ({
  name, brand, category, inciText, ingredientsConfirmed: true, declaredActives: [], usesPerWeek, status,
  am: slot.am ?? false, pm: slot.pm ?? false, season: slot.season ?? 'all', order: slot.order, howTo: slot.howTo,
});

/**
 * Ada's 16 products. Status = what the engine's reset proposal pauses
 * (checked in demo-case.test.ts). No sunscreen on purpose: R5 shows up.
 */
export const DEMO_PRODUCTS: SeedProduct[] = [
  P('Gentle Foaming Cleanser', 'Plain Theory', 'cleanser', 'Aqua, Glycerin, Panthenol, Betaine', 14, 'active',
    { am: true, pm: true, order: 10, howTo: 'Gentle cleanse' }),
  P('Clarifying Salicylic Wash', 'Fernwell', 'cleanser', 'Aqua, Salicylic Acid, Glycerin, Parfum, Limonene', 7, 'paused',
    { pm: true, order: 12, howTo: 'Salicylic cleanser' }),
  P('Melting Cleansing Balm', 'Fernwell', 'oil-cleanser', 'Ethylhexyl Palmitate, Caprylic/Capric Triglyceride, Parfum', 3, 'paused',
    { pm: true, order: 5, howTo: 'Massage in, emulsify with water' }),
  P('Glow Tonic 5% Glycolic', 'Norra', 'toner', 'Aqua, Glycolic Acid, Alcohol Denat., Glycerin', 5, 'paused',
    { am: true, order: 20, howTo: 'On a cotton pad after cleansing' }),
  P('Bright C 15% Serum', 'Halden Lab', 'serum', 'Aqua, Ascorbic Acid, Glycerin, Panthenol', 7, 'active',
    { am: true, order: 40, howTo: '3–4 drops' }),
  P('C-Boost Drops', 'Norra', 'serum', 'Aqua, 3-O-Ethyl Ascorbic Acid, Niacinamide, Glycerin', 7, 'paused',
    { am: true, order: 45, howTo: 'A few drops' }),
  P('Niacinamide 10% Serum', 'Plain Theory', 'serum', 'Aqua, Niacinamide, Zinc PCA, Glycerin', 7, 'active',
    { am: true, order: 60, howTo: 'A few drops, let it absorb' }),
  P('Daily Gel Moisturiser', 'Plain Theory', 'moisturizer', 'Aqua, Glycerin, Dimethicone, Sodium Hyaluronate, Panthenol', 14, 'active',
    { am: true, pm: true, order: 80, howTo: 'Light gel, morning and night' }),
  P('Cooling Water Cream', 'Plain Theory', 'moisturizer', 'Aqua, Glycerin, Butylene Glycol, Betaine, Panthenol', null, 'active',
    { am: true, season: 'summer', order: 80, howTo: 'Summer day cream' }),
  P('Rich Repair Night Cream', 'Norra', 'moisturizer',
    'Aqua, Isopropyl Myristate, Butyrospermum Parkii Butter, Cocos Nucifera Oil, Glycerin, Myristic Acid, Phenoxyethanol', 7, 'paused',
    { pm: true, order: 85, howTo: 'Night cream' }),
  P('Azelaic 10% Cream', 'Plain Theory', 'treatment', 'Aqua, Azelaic Acid, Glycerin, Dimethicone', 4, 'active',
    { pm: true, order: 100, howTo: 'Thin layer all over' }),
  P('BHA Pore Liquid 2%', 'Plain Theory', 'treatment', 'Aqua, Salicylic Acid, Butylene Glycol', 3, 'active',
    { pm: true, order: 100, howTo: 'Cotton pad, thin layer, away from the eyes' }),
  P('Retinol 0.3% Night Serum', 'Halden Lab', 'treatment', 'Squalane, Caprylic/Capric Triglyceride, Retinol', 3, 'active',
    { pm: true, order: 100, howTo: '2–3 drops, avoid the eye area' }),
  P('Spot Gel 5% Benzoyl Peroxide', 'Fernwell', 'treatment', 'Aqua, Benzoyl Peroxide, Glycerin', 3, 'active',
    { pm: true, order: 105, howTo: 'Only on spots' }),
  P('Exfoliating Peel 25%', 'Norra', 'peel', 'Aqua, Glycolic Acid, Lactic Acid, Salicylic Acid', 1, 'paused',
    { pm: true, order: 110, howTo: '10 minutes at most' }),
  P('Second Skin Foundation', 'Halden Lab', 'makeup',
    'Aqua, Isododecane, Dimethicone, Trimethylsiloxysilicate, Alcohol Denat., Silica', null, 'active',
    { am: true, order: 120, howTo: 'Some days a week' }),
];
