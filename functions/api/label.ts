/**
 * Reads an ingredient list (INCI) from 1–3 label photos with Claude.
 * The model only transcribes: it never judges ingredients or products
 * (CLAUDE.md principle 2). The person reviews every line before saving.
 * Photos are not stored anywhere by this function.
 */
import Anthropic from '@anthropic-ai/sdk';
import { accessEmail, type AccessEnv } from '../_access';

interface Env extends AccessEnv {
  ANTHROPIC_API_KEY?: string;
}

interface IncomingImage { media_type: string; data: string }

const MODEL = 'claude-opus-5-5';
const MAX_IMAGES = 3;
/** ~4 MB of base64 per photo (the app sends ~2000 px JPEGs, well under this). */
const MAX_B64 = 4 * 1024 * 1024 * 1.37;
const MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp']);

const SYSTEM = `You transcribe ingredient lists from photos of cosmetic product labels.

Rules:
- Copy only what you can see. Never complete or correct a list from memory of the product, and never add ingredients that are not visible.
- Return every ingredient in the order printed, using its standard INCI name in English (e.g. "Aqua", "Butylene Glycol", "Ascorbyl Glucoside"). If the label is in Japanese, Korean, Chinese or another language, translate each printed ingredient to its standard INCI name and put the printed original in raw_text.
- raw_text is exactly what is printed for that ingredient (original script and spelling).
- confidence: "high" when the word is clearly legible; "medium" when legible but you had to infer a letter or two, or the translation to INCI is not certain; "low" when it is cut off, blurry, covered or partly guessed.
- If the photos show several lists (e.g. different languages), use the INCI/English list when present and do not duplicate ingredients.
- If the list is cut off or a part is not visible, add a warning saying the list is incomplete. Write every warning in short, plain words, in the language the request asks for.
- product_name and brand: copy them if visible, otherwise "".
- If you cannot find an ingredient list at all, set unreadable to true and return an empty inci array.
- Do not comment on whether ingredients are good, bad, safe or suitable.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['product_name', 'brand', 'language_detected', 'inci', 'warnings', 'unreadable'],
  properties: {
    product_name: { type: 'string' },
    brand: { type: 'string' },
    language_detected: { type: 'string', description: 'Main language of the label, e.g. "es", "en", "ja", "ko".' },
    inci: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'confidence', 'raw_text'],
        properties: {
          name: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          raw_text: { type: 'string' },
        },
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
    unreadable: { type: 'boolean' },
  },
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** Lets the app hide the photo option until a key is configured. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await accessEmail(request, env))) return json({ error: 'unauthorized' }, 401);
  return json({ configured: !!env.ANTHROPIC_API_KEY });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const email = await accessEmail(request, env);
  if (!email) return json({ error: 'unauthorized' }, 401);
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'not-configured' }, 503);

  let images: IncomingImage[];
  let lang: 'es' | 'en' = 'es';
  try {
    const body = (await request.json()) as { images?: IncomingImage[]; lang?: unknown };
    images = body.images ?? [];
    if (body.lang === 'en') lang = 'en';
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  if (!Array.isArray(images) || images.length < 1 || images.length > MAX_IMAGES
    || !images.every((i) => MEDIA.has(i.media_type) && typeof i.data === 'string' && i.data.length > 0 && i.data.length < MAX_B64)) {
    return json({ error: 'bad-request' }, 400);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Transcription is routine work; medium keeps cost low without losing accuracy.
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      // If a safety classifier declines, retry on the model Anthropic recommends.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          ...images.map((i) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: i.media_type as 'image/jpeg' | 'image/png' | 'image/webp', data: i.data },
          })),
          {
            type: 'text',
            text: `${images.length > 1 ? 'These photos are the same product. Transcribe its ingredient list.' : 'Transcribe the ingredient list of this product.'} Write any warnings in ${lang === 'en' ? 'English' : 'Spanish'}.`,
          },
        ],
      }],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
    if (response.stop_reason === 'max_tokens') return json({ error: 'too-long' }, 422);
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'empty' }, 502);
    const result = JSON.parse(text.text) as unknown;
    return json({ result, model: response.model, usage: { input: response.usage.input_tokens, output: response.usage.output_tokens } });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'not-configured' }, 503);
    if (e instanceof Anthropic.BadRequestError) return json({ error: 'bad-image' }, 400);
    if (e instanceof Anthropic.APIError) return json({ error: 'upstream' }, 502);
    return json({ error: 'upstream' }, 502);
  }
};
