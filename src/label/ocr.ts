/**
 * Free, on-device label reading with Tesseract (Apache-2.0). The photo never
 * leaves the phone. Files are served by the app itself (public/ocr) and the
 * English data is cached after the first use. Loaded only when needed.
 */
import ingredientsDb from '../data/ingredients.json';
import { buildIndex, type IngredientDb } from '../engine';
import type { LabelResult } from './label';
import { ocrToResult } from './ocr-parse';

const index = buildIndex(ingredientsDb as IngredientDb);
const MAX_EDGE = 2000;

/** Grayscale + a little contrast helps Tesseract on glossy, coloured packs. */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

export type OcrProgress = { stage: 'loading' | 'reading'; pct: number };

export async function readLabelOnDevice(files: Blob[], onProgress?: (p: OcrProgress) => void): Promise<LabelResult> {
  const { createWorker, OEM } = await import('tesseract.js');
  let current = 0;
  const base = import.meta.env.BASE_URL;
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${base}ocr/worker.min.js`,
    corePath: `${base}ocr/core`,
    langPath: `${base}ocr/lang`,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.({ stage: 'reading', pct: Math.round(((current + m.progress) / files.length) * 100) });
      else onProgress?.({ stage: 'loading', pct: Math.round(m.progress * 100) });
    },
  });
  try {
    const texts: string[] = [];
    const conf = new Map<string, number>();
    for (const f of files) {
      const { data } = await worker.recognize(await prepare(f), {}, { text: true, blocks: true });
      texts.push(data.text);
      for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) {
        const k = w.text.replace(/[.,;:]+$/, '').toLowerCase();
        conf.set(k, Math.min(conf.get(k) ?? 100, w.confidence));
      }
      current++;
    }
    return ocrToResult(texts.join('\n'), conf, index);
  } finally {
    await worker.terminate();
  }
}
