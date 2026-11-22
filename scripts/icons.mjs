/**
 * Builds every app icon from assets/icon.svg (the Truce calm water drop).
 * Run after changing the logo: `npm run icons`. Output goes to public/.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const src = readFileSync(new URL('../assets/icon.svg', import.meta.url), 'utf8');
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname;

// Full-bleed square (no rounded corners): iOS and Android round it themselves.
// `scale` shrinks the drop so it stays inside Android's maskable safe zone.
const square = (scale) => src
  .replace(/ rx="115"/, '')
  .replace('<g id="drop">', `<g id="drop" transform="translate(256 256) scale(${scale}) translate(-256 -256)">`);

const png = (svg, size, name) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(out(name));

writeFileSync(out('icon.svg'), src);
await Promise.all([
  png(src, 192, 'icon-192.png'),
  png(src, 512, 'icon-512.png'),
  png(square(0.8), 512, 'icon-maskable-512.png'),
  png(square(0.9), 180, 'apple-touch-icon.png'),
]);
console.log('Icons written to public/');
