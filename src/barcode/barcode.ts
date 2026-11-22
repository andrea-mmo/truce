/** Barcode → Open Beauty Facts (open data, ODbL). Pure helpers are tested. */
import { parseInci, type IngredientIndex } from '../engine';

/** EAN-8 / UPC-A / EAN-13 / GTIN-14 check digit. */
export function validBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function cleanCode(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Community data can hold marketing text instead of an INCI list. Judged by
 * shape (our ingredient database is small, so "known ingredients" would be
 * misleading): several comma-separated items, each short, none a sentence.
 */
export function looksLikeInci(text: string, index: IngredientIndex): boolean {
  const items = parseInci(text, index).map((p) => p.raw);
  if (items.length < 4) return false;
  const tooLong = items.filter((i) => i.length > 60 || i.split(/\s+/).length > 7).length;
  return tooLong / items.length <= 0.15;
}

/** The serverless functions only exist on the published app. */
export const onDevServer = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export type LookupResult =
  | { found: false; code: string }
  | { found: true; code: string; name: string; brand: string; ingredients: string; url: string };

export type LookupError = 'bad-code' | 'offline' | 'login' | 'not-available' | 'failed';
export class LookupFailed extends Error { constructor(public code: LookupError) { super(code); } }

export async function lookupProduct(code: string): Promise<LookupResult> {
  if (!validBarcode(code)) throw new LookupFailed('bad-code');
  if (onDevServer()) throw new LookupFailed('not-available');
  let res: Response;
  try {
    res = await fetch(`/api/product/${code}`, { credentials: 'same-origin' });
  } catch {
    throw new LookupFailed('offline');
  }
  if (res.status === 404) throw new LookupFailed('not-available');
  if (res.redirected || res.status === 401 || !(res.headers.get('content-type') ?? '').includes('json')) throw new LookupFailed('login');
  if (!res.ok) throw new LookupFailed('failed');
  const b = (await res.json()) as Partial<LookupResult> & { found?: boolean };
  if (!b.found) return { found: false, code };
  return {
    found: true, code,
    name: String((b as { name?: string }).name ?? ''), brand: String((b as { brand?: string }).brand ?? ''),
    ingredients: String((b as { ingredients?: string }).ingredients ?? ''), url: String((b as { url?: string }).url ?? ''),
  };
}
