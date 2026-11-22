/** Visual style proposals. Saved per device (a display preference, not health data). */
export type Theme = 'elegante' | 'suave' | 'fresco' | 'clinico';

/** Names and descriptions are in src/i18n (settings.themes). */
export const THEMES: { id: Theme; swatch: string[] }[] = [
  { id: 'clinico', swatch: ['#f4f7f8', '#2a8c87', '#17252b'] },
  { id: 'elegante', swatch: ['#fbf8f4', '#c98b6b', '#2b2724'] },
  { id: 'suave', swatch: ['#f7f8f6', '#5f8f7b', '#1f2a26'] },
  { id: 'fresco', swatch: ['#fff8f4', '#ff8f70', '#7350b0'] },
];

const KEY = 'piel.theme';
/** Chosen on 21-11-2026: clinical but warm. */
export const DEFAULT_THEME: Theme = 'clinico';

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'suave' || t === 'fresco' || t === 'elegante' || t === 'clinico') return t;
  } catch { /* storage blocked: default */ }
  return DEFAULT_THEME;
}

export function applyTheme(t: Theme) {
  if (t === 'elegante') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  // Browser UI colour (address bar on phones) follows the style.
  const meta = document.querySelector('meta[name="theme-color"]');
  const dark = t === 'clinico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  meta?.setAttribute('content', dark ? '#0f1719' : THEMES.find((x) => x.id === t)?.swatch[0] ?? '#fbf8f4');
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}
