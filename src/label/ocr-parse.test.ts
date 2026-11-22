import db from '../data/ingredients.json';
import { buildIndex, type IngredientDb } from '../engine';
import { cleanOcr, extractSection, nearestKnown, ocrToResult } from './ocr-parse';

const index = buildIndex(db as IngredientDb);

describe('OCR text → INCI rows', () => {
  it('takes the section after "Ingredients:" and stops at the next language', () => {
    const t = 'Gentle cleanser\nINGREDIENTS: Aqua, Glycerin, Sodium Hyaluronate.\nINGREDIENTES: Agua, Glicerina';
    expect(extractSection(t)).toEqual({ section: ' Aqua, Glycerin, Sodium Hyaluronate.\n', markerFound: true });
  });

  it('glues hyphenated line breaks and line breaks', () => {
    expect(cleanOcr('Aqua, Buty-\nlene Glycol,\nPanthenol.')).toBe('Aqua, Butylene Glycol, Panthenol');
  });

  it('corrects small OCR slips to known INCI names, but not real unknowns', () => {
    expect(nearestKnown('Glycerln', index)).toBe('Glycerin');
    expect(nearestKnown('Butylene Glycoi', index)).toBe('Butylene Glycol');
    expect(nearestKnown('Glycerin', index)).toBeNull();
    expect(nearestKnown('Centella Asiatica Extract', index)).toBeNull();
  });

  it('builds rows with confidence and warnings', () => {
    const conf = new Map([['aqua', 96], ['glycerln', 70], ['panthenol', 91], ['centella', 52], ['asiatica', 88], ['extract', 95]]);
    const r = ocrToResult('Ingredients: Aqua, Glycerln, Panthenol, Centella Asiatica Extract, 1%, —', conf, index);
    expect(r.inci).toEqual([
      { name: 'Aqua', confidence: 'high', raw_text: 'Aqua' },
      { name: 'Glycerin', confidence: 'medium', raw_text: 'Glycerln' },
      { name: 'Panthenol', confidence: 'high', raw_text: 'Panthenol' },
      { name: 'Centella Asiatica Extract', confidence: 'low', raw_text: 'Centella Asiatica Extract' },
    ]);
    expect(r.warnings).toEqual(['ocr-fixed']);
    expect(r.unreadable).toBe(false);
  });

  it('no list found → unreadable', () => {
    expect(ocrToResult('Made in France 50 ml', new Map(), index).unreadable).toBe(true);
  });
});
