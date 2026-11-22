/**
 * Demo build (`npm run dev:demo`, `npm run build:demo`): invented data, no
 * server features (sync, AI label reading, barcode lookup need the private
 * backend behind Cloudflare Access). Replaced at build time, so the private
 * build has no demo code paths left in it.
 */
export const IS_DEMO = import.meta.env.VITE_DEMO === '1';
