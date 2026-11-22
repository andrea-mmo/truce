/**
 * Looks up a product by barcode in Open Beauty Facts (open data, ODbL).
 * Goes through our server so we can identify the app politely (generic
 * User-Agent, no personal data) and only pass back the fields we need.
 */
import { accessEmail, type AccessEnv } from '../../_access';

const OBF = 'https://world.openbeautyfacts.org/api/v2/product';
const FIELDS = 'code,product_name,product_name_es,product_name_en,brands,ingredients_text,ingredients_text_es,ingredients_text_en,url';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

interface ObfProduct {
  code?: string; url?: string; brands?: string;
  product_name?: string; product_name_es?: string; product_name_en?: string;
  ingredients_text?: string; ingredients_text_es?: string; ingredients_text_en?: string;
}

export const onRequestGet: PagesFunction<AccessEnv> = async ({ request, env, params }) => {
  if (!(await accessEmail(request, env))) return json({ error: 'unauthorized' }, 401);
  const code = String(params.code ?? '');
  // EAN-8, UPC-A, EAN-13, GTIN-14.
  if (!/^\d{8,14}$/.test(code)) return json({ error: 'bad-code' }, 400);

  let res: Response;
  try {
    res = await fetch(`${OBF}/${code}.json?fields=${FIELDS}`, { headers: { 'User-Agent': 'Truce/0.1 (private skincare app)' } });
  } catch {
    return json({ error: 'upstream' }, 502);
  }
  if (!res.ok) return json({ error: 'upstream' }, 502);
  const body = (await res.json()) as { status?: number; product?: ObfProduct };
  if (body.status !== 1 || !body.product) return json({ found: false });

  const p = body.product;
  // English INCI first (that's how INCI is written), then the generic field, then Spanish.
  const ingredients = (p.ingredients_text_en || p.ingredients_text || p.ingredients_text_es || '').trim();
  return json({
    found: true,
    code,
    name: (p.product_name_es || p.product_name || p.product_name_en || '').trim(),
    brand: (p.brands ?? '').split(',')[0]?.trim() ?? '',
    ingredients,
    url: p.url || `https://world.openbeautyfacts.org/product/${code}`,
  });
};
