/**
 * Label reading (Phase 2): photo → Claude transcribes the INCI list → the
 * person reviews every line → the list is saved. Pure helpers are tested;
 * the photo never leaves memory except to be read.
 */
import { normalizeName, type IngredientIndex } from '../engine';

export type Confidence = 'high' | 'medium' | 'low';

export interface LabelResult {
  product_name: string;
  brand: string;
  language_detected: string;
  inci: { name: string; confidence: Confidence; raw_text: string }[];
  warnings: string[];
  unreadable: boolean;
}

export interface ReviewRow {
  key: number;
  name: string;
  confidence: Confidence;
  raw: string;
}

/** Defensive check of what the server returned (never trust shape blindly). */
export function validateLabelResult(x: unknown): LabelResult | null {
  const r = x as Partial<LabelResult> | null;
  if (!r || typeof r !== 'object' || !Array.isArray(r.inci) || !Array.isArray(r.warnings) || typeof r.unreadable !== 'boolean') return null;
  const inci = r.inci
    .filter((i) => i && typeof i.name === 'string' && i.name.trim())
    .map((i) => ({
      name: i.name.trim(),
      confidence: (['high', 'medium', 'low'] as const).includes(i.confidence as Confidence) ? (i.confidence as Confidence) : 'low',
      raw_text: typeof i.raw_text === 'string' ? i.raw_text : '',
    }));
  return {
    product_name: typeof r.product_name === 'string' ? r.product_name.trim() : '',
    brand: typeof r.brand === 'string' ? r.brand.trim() : '',
    language_detected: typeof r.language_detected === 'string' ? r.language_detected : '',
    inci,
    warnings: r.warnings.filter((w): w is string => typeof w === 'string'),
    unreadable: r.unreadable,
  };
}

export function toRows(r: LabelResult): ReviewRow[] {
  return r.inci.map((i, k) => ({ key: k, name: i.name, confidence: i.confidence, raw: i.raw_text }));
}

/** Known to our ingredient database (so the analysis can use it). */
export function isKnown(name: string, index: IngredientIndex): boolean {
  return index.has(normalizeName(name));
}

/** The confirmed rows as an INCI text, ready for the product form. */
export function rowsToInci(rows: ReviewRow[]): string {
  return rows.map((r) => r.name.trim()).filter(Boolean).join(', ');
}

// ---------------------------------------------------------------- browser side

/** Longest edge sent to the model (it reads up to 2576 px; 2000 keeps small print legible). */
const MAX_EDGE = 2000;

/** Re-encodes a photo as JPEG (drops EXIF/GPS) at a size the model reads well. */
export async function prepareImage(file: Blob): Promise<{ media_type: 'image/jpeg'; data: string }> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.9));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { media_type: 'image/jpeg', data: btoa(bin) };
}

export type LabelError = 'not-configured' | 'refused' | 'busy' | 'bad-image' | 'offline' | 'login' | 'not-available' | 'failed';

/** `lang`: the app's language, so the warnings come back in it. */
export async function readLabel(files: Blob[], lang: 'es' | 'en' = 'es'): Promise<LabelResult> {
  // The serverless function only exists on the published app.
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw new LabelReadError('not-available');
  const images = await Promise.all(files.map(prepareImage));
  let res: Response;
  try {
    res = await fetch('/api/label', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ images, lang }),
    });
  } catch {
    throw new LabelReadError('offline');
  }
  const isJson = (res.headers.get('content-type') ?? '').includes('json');
  if (res.status === 404) throw new LabelReadError('not-available');
  if (!isJson || res.redirected || res.status === 401) throw new LabelReadError('login');
  const body = (await res.json()) as { result?: unknown; error?: string };
  if (!res.ok) {
    const code = body.error;
    throw new LabelReadError(code === 'not-configured' || code === 'refused' || code === 'busy' || code === 'bad-image' ? code : 'failed');
  }
  const result = validateLabelResult(body.result);
  if (!result) throw new LabelReadError('failed');
  return result;
}

export class LabelReadError extends Error {
  constructor(public code: LabelError) { super(code); }
}

/** Whether photo reading is set up (an API key exists on the server). */
export async function labelReadingAvailable(): Promise<boolean> {
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return false;
  try {
    const res = await fetch('/api/label', { credentials: 'same-origin' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return false;
    return ((await res.json()) as { configured?: boolean }).configured === true;
  } catch {
    return false;
  }
}
