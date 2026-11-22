/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Shown in Settings so you can tell which version is running.
let commit = 'dev';
try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a git checkout */ }
const APP_VERSION = `${new Date().toISOString().slice(0, 10)} · ${commit}`;

/**
 * Demo build (`--mode demo`): every import of data/seed gets the invented case
 * instead, so personal data is never even read into the demo bundle.
 */
function demoSeed(): Plugin {
  const demo = fileURLToPath(new URL('./src/data/seed.demo.ts', import.meta.url));
  return {
    name: 'truce-demo-seed',
    enforce: 'pre',
    resolveId(source) {
      return /(^|\/)data\/seed(\.ts)?$/.test(source) ? demo : null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
  define: { __APP_VERSION__: JSON.stringify(demo ? `${APP_VERSION} · demo` : APP_VERSION) },
  // Separate folder so a demo build never overwrites the private one.
  build: { outDir: demo ? 'dist-demo' : 'dist' },
  plugins: [
    ...(demo ? [demoSeed()] : []),
    react(),
    VitePWA({
      // Ask before switching to a new version (an 'Actualizar' button), instead of reloading by surprise.
      registerType: 'prompt',
      // Behind Cloudflare Access the manifest must be fetched with the login cookie.
      useCredentials: true,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      // OCR files are big and only needed when reading a label: not precached.
      workbox: { globIgnores: ['ocr/**'] },
      manifest: {
        name: demo ? 'Truce · Demo' : 'Truce · Mi rutina',
        short_name: 'Truce',
        description: 'Organiza tu rutina de skincare y haz las paces con tu piel, paso a paso.',
        lang: 'es',
        theme_color: '#f4f7f8',
        background_color: '#f4f7f8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    env: { TZ: 'Europe/London' },
  },
  };
});
