/**
 * Translations. `useT()` in components (they re-render when the language
 * changes); `getT()` only for one-off texts outside render, e.g. an error.
 */
import { es, type Messages } from './es';
import { en } from './en';
import { getLang, useLang, type Lang } from './lang';

export const MESSAGES: Record<Lang, Messages> = { es, en };

export function getT(): Messages {
  return MESSAGES[getLang()];
}

export function useT(): Messages {
  return MESSAGES[useLang()];
}

export type { Messages };
export { getLang, setLang, useLang, LANGS, type Lang } from './lang';
export { capitalize, fmtDate, fmtDateTime, fmtNum } from './format';
