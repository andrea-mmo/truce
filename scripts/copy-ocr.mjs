// Copies the on-device OCR files (Tesseract, Apache-2.0; English data, MIT)
// into public/ocr so the app serves them itself instead of a CDN.
// Runs before `vite` dev/build (see package.json).
import { cpSync, mkdirSync } from 'node:fs';

const out = 'public/ocr';
mkdirSync(`${out}/core`, { recursive: true });
mkdirSync(`${out}/lang`, { recursive: true });
cpSync('node_modules/tesseract.js/dist/worker.min.js', `${out}/worker.min.js`);
for (const f of ['tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js']) {
  cpSync(`node_modules/tesseract.js-core/${f}`, `${out}/core/${f}`);
}
// "best_int": better accuracy than "fast", ~3 MB.
cpSync('node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', `${out}/lang/eng.traineddata.gz`);
console.log('OCR files copied to', out);
