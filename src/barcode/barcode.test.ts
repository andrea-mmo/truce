import db from '../data/ingredients.json';
import { buildIndex, type IngredientDb } from '../engine';
import { cleanCode, looksLikeInci, validBarcode } from './barcode';

const index = buildIndex(db as IngredientDb);

describe('barcodes', () => {
  it('check digit', () => {
    expect(validBarcode('4005808925124')).toBe(true); // Nivea Creme (EAN-13)
    expect(validBarcode('8809598452053')).toBe(true); // COSRX (EAN-13)
    expect(validBarcode('40058153')).toBe(true);      // EAN-8
    expect(validBarcode('4005808925125')).toBe(false);
    expect(validBarcode('12345')).toBe(false);
    expect(cleanCode(' 4 005808-925124 ')).toBe('4005808925124');
  });

  it('tells an INCI list from marketing text', () => {
    expect(looksLikeInci('Aqua, Paraffinum Liquidum, Cera Microcristallina, Glycerin, Lanolin Alcohol, Parfum', index)).toBe(true);
    expect(looksLikeInci('La formule maintient l’hydratation & rend votre peau plus douce pendant 48h.', index)).toBe(false);
    expect(looksLikeInci('Aqua, Glycerin', index)).toBe(false);
    // A real list with many ingredients our small database doesn't know yet.
    expect(looksLikeInci('Aqua, Paraffinum Liquidum, Cera Microcristallina, Glycerin, Lanolin Alcohol (Eucerit), Paraffin, Panthenol, Magnesium Sulfate, Decyl Oleate, Octyldodecanol, Aluminum Stearates, Citric Acid', index)).toBe(true);
    expect(looksLikeInci('Une crème riche, nourrissante, idéale pour les peaux sèches qui ont besoin de douceur au quotidien, à appliquer matin et soir', index)).toBe(false);
  });
});
