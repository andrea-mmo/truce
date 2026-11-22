import db from '../data/ingredients.json';
import { buildIndex, normalizeName, parseInci, splitInci, type IngredientDb } from './index';

const index = buildIndex(db as IngredientDb);

describe('INCI parsing', () => {
  it('splits on commas but not inside parentheses', () => {
    expect(splitInci('Water (Aqua, Eau), Glycerin, Parfum (Fragrance).')).toEqual(['Water (Aqua, Eau)', 'Glycerin', 'Parfum (Fragrance)']);
  });

  it('normalises case, spaces, slashes and trailing dots', () => {
    expect(normalizeName('  caprylic / capric  triglyceride. ')).toBe('CAPRYLIC/CAPRIC TRIGLYCERIDE');
    expect(normalizeName('Alcohol Denat.')).toBe('ALCOHOL DENAT.');
    expect(normalizeName('Alcohol Denat')).toBe('ALCOHOL DENAT.');
  });

  it('an oil cleanser list: first ingredient is a C1 ester, unknowns stay unknown', () => {
    const p = parseInci('Ethylhexyl Palmitate, Sorbeth-30 Tetraoleate, Sorbitan Sesquioleate, Caprylic/Capric Triglyceride, Butyl Avocadate, Parfum, Helianthus Annuus Seed Oil, Houttuynia Cordata Extract', index);
    expect(p[0]).toMatchObject({ position: 1, ingredient: { inci: 'ETHYLHEXYL PALMITATE', watch: 'C1' } });
    expect(p[5].ingredient?.fragrance).toBe(true);
    expect(p[7]).toMatchObject({ raw: 'Houttuynia Cordata Extract', ingredient: null });
  });

  it('aliases: BG, Water (Aqua), L-ascorbic acid 2-glucoside', () => {
    const p = parseInci('Water (Aqua), BG, L-Ascorbic Acid 2-Glucoside', index);
    expect(p.map((x) => x.ingredient?.inci)).toEqual(['AQUA', 'BUTYLENE GLYCOL', 'ASCORBYL GLUCOSIDE']);
  });

  it('line breaks and "…" are tolerated', () => {
    expect(parseInci('Aqua,\nGlycerin, …', index).map((x) => x.ingredient?.inci)).toEqual(['AQUA', 'GLYCERIN']);
  });
});
