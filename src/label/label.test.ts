import db from '../data/ingredients.json';
import { buildIndex, type IngredientDb } from '../engine';
import { isKnown, rowsToInci, toRows, validateLabelResult } from './label';

const index = buildIndex(db as IngredientDb);

describe('label reading helpers', () => {
  it('accepts a good result and cleans it', () => {
    const r = validateLabelResult({
      product_name: ' Hydra Mist ', brand: 'Kumo Lab', language_detected: 'ja',
      inci: [
        { name: 'Ascorbyl Glucoside', confidence: 'high', raw_text: 'L-アスコルビン酸 2-グルコシド' },
        { name: '  ', confidence: 'high', raw_text: '' },
        { name: 'Panthenol', confidence: 'weird', raw_text: 'パンテノール' },
      ],
      warnings: ['lista incompleta', 3], unreadable: false,
    });
    expect(r).toEqual({
      product_name: 'Hydra Mist', brand: 'Kumo Lab', language_detected: 'ja',
      inci: [
        { name: 'Ascorbyl Glucoside', confidence: 'high', raw_text: 'L-アスコルビン酸 2-グルコシド' },
        { name: 'Panthenol', confidence: 'low', raw_text: 'パンテノール' },
      ],
      warnings: ['lista incompleta'], unreadable: false,
    });
  });

  it('rejects malformed results', () => {
    expect(validateLabelResult(null)).toBeNull();
    expect(validateLabelResult({ inci: 'x' })).toBeNull();
    expect(validateLabelResult({ inci: [], warnings: [] })).toBeNull();
  });

  it('rows → INCI text, skipping emptied rows; known vs unknown', () => {
    const rows = toRows(validateLabelResult({ product_name: '', brand: '', language_detected: 'en', inci: [
      { name: 'Aqua', confidence: 'high', raw_text: 'Aqua' }, { name: 'Glycerin', confidence: 'medium', raw_text: 'Glycerin' },
    ], warnings: [], unreadable: false })!);
    rows.push({ key: 9, name: ' ', confidence: 'high', raw: '' });
    expect(rowsToInci(rows)).toBe('Aqua, Glycerin');
    expect(isKnown('aqua', index)).toBe(true);
    expect(isKnown('Houttuynia Cordata Extract', index)).toBe(false);
  });
});
