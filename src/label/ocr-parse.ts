/**
 * Turns raw OCR text from a label into review rows. OCR reads letter by
 * letter, so we: find the ingredient section, glue broken lines, split by
 * commas, drop noise, and gently correct near-misses to INCI names we know
 * (shown as "Revisar" so the person checks them). Pure and tested.
 */
import { normalizeName, splitInci, type IngredientIndex } from '../engine';
import type { Confidence, LabelResult } from './label';

const MARKER = /(ingredients?|ingredientes|ingr[ée]dients|inci|composition|zutaten|ingredienti|成分)\s*[:：]?/i;

export function extractSection(text: string): { section: string; markerFound: boolean } {
  const m = MARKER.exec(text);
  if (!m) return { section: text, markerFound: false };
  let rest = text.slice(m.index + m[0].length);
  // Stop where another language's list starts.
  const next = MARKER.exec(rest.slice(20));
  if (next) rest = rest.slice(0, 20 + next.index);
  return { section: rest, markerFound: true };
}

export function cleanOcr(s: string): string {
  return s
    .replace(/-\s*\n\s*/g, '')       // hyphenated line breaks
    .replace(/\s*\n\s*/g, ' ')        // other line breaks
    .replace(/[•·]/g, ',')            // bullets used as separators
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());

/** Closest known INCI name if it's a small OCR slip away (e.g. "Glycerln" → "Glycerin"). */
export function nearestKnown(raw: string, index: IngredientIndex): string | null {
  const key = normalizeName(raw);
  if (index.has(key)) return null;
  const max = key.length <= 8 ? 1 : key.length <= 16 ? 2 : 3;
  let best: { name: string; d: number } | null = null;
  for (const [k, ing] of index) {
    if (Math.abs(k.length - key.length) > max) continue;
    const d = levenshtein(key, k);
    if (d <= max && (!best || d < best.d)) best = { name: ing.inci, d };
  }
  return best ? titleCase(best.name) : null;
}

/** Lowest OCR confidence (0–100) among the words of an item; 100 if unknown. */
function itemConfidence(item: string, wordConf: Map<string, number>): number {
  const words = item.split(/[\s/()-]+/).filter(Boolean);
  const confs = words.map((w) => wordConf.get(w.replace(/[.,;:]+$/, '').toLowerCase())).filter((c): c is number => c !== undefined);
  return confs.length ? Math.min(...confs) : 100;
}

export function ocrToResult(text: string, wordConf: Map<string, number>, index: IngredientIndex): LabelResult {
  const { section, markerFound } = extractSection(text);
  const items = splitInci(cleanOcr(section))
    .map((i) => i.trim())
    .filter((i) => i.length >= 2 && i.length <= 80 && (i.match(/[a-z]/gi)?.length ?? 0) / i.length >= 0.6);

  const inci = items.map((raw) => {
    const fixed = nearestKnown(raw, index);
    const conf = itemConfidence(raw, wordConf);
    const confidence: Confidence = fixed ? 'medium' : conf < 60 ? 'low' : conf < 85 ? 'medium' : 'high';
    return { name: fixed ?? raw, confidence, raw_text: raw };
  });

  const warnings: string[] = [];
  // Codes, not words: LabelReader shows them in the app's language (i18n label.warning).
  if (!markerFound && inci.length) warnings.push('ocr-no-marker');
  if (inci.some((i) => i.name !== i.raw_text)) warnings.push('ocr-fixed');
  return { product_name: '', brand: '', language_detected: '', inci, warnings, unreadable: inci.length < 2 };
}
