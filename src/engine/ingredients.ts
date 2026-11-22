/** Ingredient database types and INCI list parsing. Pure, no I/O. */

export type ActiveClass = 'aha' | 'bha' | 'pha' | 'retinoid' | 'azelaic' | 'vitC' | 'niacinamide' | 'bpo' | 'none';

export interface IngredientSource {
  kind: 'cosing' | 'rules' | 'literature';
  ref: string;
  covers: ('inci' | 'functions' | 'annex' | 'classification')[];
  evidence: 'official' | 'pending-review' | 'low' | 'moderate' | 'high';
}

export interface Ingredient {
  inci: string;
  aliases: string[];
  cosing: { id: string; url: string; functions: string[]; annex: string[]; checkedOn: string };
  activeClass: ActiveClass;
  /** 0–3, used for the weekly exfoliation load (R4). */
  exfoliationWeight: number;
  /** "A vigilar" group for comedone-prone skin (C1–C3). Never a verdict. */
  watch: 'C1' | 'C2' | 'C3' | null;
  richEmollient: boolean;
  filmFormer: boolean;
  fragrance: boolean;
  dryingAlcohol: boolean;
  /** Ingredients listed after this one are usually at low concentration. */
  preservativeMarker: boolean;
  irritancy: 'low' | 'med' | 'high';
  photosensitizing: boolean;
  pregnancyCaution: boolean;
  source: IngredientSource[];
}

export interface IngredientDb {
  version: string;
  attribution: string;
  ingredients: Ingredient[];
}

/** Uppercase, single spaces, no trailing dot/asterisk, normalised slashes. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[*†]+/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '')
    .replace(/ DENAT$/, ' DENAT.'); // "Alcohol Denat." keeps its dot
}

export type IngredientIndex = Map<string, Ingredient>;

export function buildIndex(db: IngredientDb): IngredientIndex {
  const idx: IngredientIndex = new Map();
  for (const ing of db.ingredients) {
    for (const name of [ing.inci, ...ing.aliases]) idx.set(normalizeName(name), ing);
  }
  return idx;
}

/** Split an INCI list on commas, ignoring commas inside parentheses. */
export function splitInci(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text.replace(/\r?\n/g, ' ')) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';' || ch === '、') && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts
    .map((p) => p.trim())
    .map((p, i, all) => (i === all.length - 1 && !/DENAT\.$/i.test(p) ? p.replace(/\.+$/, '') : p))
    .filter((p) => p && !/^[.…]+$/.test(p));
}

export interface ParsedIngredient {
  /** 1-based position in the list. */
  position: number;
  raw: string;
  /** null = not in our database: shown as "desconocido", never guessed. */
  ingredient: Ingredient | null;
}

export function parseInci(text: string, index: IngredientIndex): ParsedIngredient[] {
  return splitInci(text).map((raw, i) => {
    const key = normalizeName(raw);
    // "Water (Aqua)" or "Aqua (Water)": try the whole thing, then each part.
    const candidates = [key, ...key.split(/[()]/).map((x) => x.trim()).filter(Boolean)];
    const hit = candidates.map((k) => index.get(k)).find(Boolean) ?? null;
    return { position: i + 1, raw, ingredient: hit };
  });
}
