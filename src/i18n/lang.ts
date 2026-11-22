/**
 * App language. Chosen automatically from the device the first time and
 * changeable in Settings. Saved per device, like the visual style: it is a
 * display preference, not personal data.
 */
import { useSyncExternalStore } from 'react';

export type Lang = 'es' | 'en';

/** Shown in the picker in their own language, so anyone can find theirs. */
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'es', name: 'Español' },
  { id: 'en', name: 'English' },
];

/** Locale used for dates and numbers. */
export const LOCALE: Record<Lang, string> = { es: 'es-ES', en: 'en-GB' };

const KEY = 'piel.lang';
const isLang = (x: unknown): x is Lang => x === 'es' || x === 'en';

/** First device language we support; Spanish otherwise. */
export function detectLang(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): Lang {
  for (const l of languages) {
    const base = l?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'es';
}

function load(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch { /* storage blocked */ }
  return detectLang();
}

let current: Lang = load();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang, persist = true) {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  if (persist) {
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  }
  listeners.forEach((fn) => fn());
}

export function useLang(): Lang {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => current);
}
