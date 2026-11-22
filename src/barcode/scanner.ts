/**
 * Camera barcode scanning. Uses the BarcodeDetector ponyfill (works on
 * iPhone too) with its WebAssembly served from our own app, not a CDN.
 * Loaded only when the scanner opens.
 */
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

prepareZXingModule({
  overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
});

export function createDetector() {
  return new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
}
