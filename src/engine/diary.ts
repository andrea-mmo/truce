import { addDays, toYmd } from './dates';
import type { TriageId } from './types';

/** Fixed diary tags (REGLAS.md → F). Free text is never analysed. */
export type DiaryTag =
  | 'stinging'      // F1 Pica o arde
  | 'picked'        // F2 Me he apretado granos
  | 'newProduct'    // F3 Producto nuevo
  | 'makeup'        // F4 Me he maquillado
  | 'warningSigns'  // F5 Dolor, calor, pus o fiebre → T7
  | 'breakout'      // F6 (registro)
  | 'period'        // F6
  | 'badSleep'      // F6
  | 'stress'        // F6
  | 'supplement';   // F6 Empecé un suplemento

export const DIARY_TAGS: DiaryTag[] = [
  'breakout', 'stinging', 'picked', 'makeup', 'newProduct', 'supplement', 'period', 'badSleep', 'stress', 'warningSigns',
];

export interface DiaryDay {
  date: string;
  tags: DiaryTag[];
}

/** Tags of a given day (date offset from today: 0 = today, -1 = yesterday). */
export function tagsOn(diary: DiaryDay[], today: Date, offset: number): DiaryTag[] {
  const key = toYmd(addDays(today, offset));
  return diary.find((d) => d.date === key)?.tags ?? [];
}

/** F5: warning signs marked today or in the 2 previous days → T7. */
export const WARNING_DAYS = 3;

export function diaryTriage(diary: DiaryDay[], today: Date): TriageId[] {
  for (let i = 0; i < WARNING_DAYS; i++) {
    if (tagsOn(diary, today, -i).includes('warningSigns')) return ['T7'];
  }
  return [];
}

/** How many days each tag was marked in the last `days` days (for patterns). */
export function tagCounts(diary: DiaryDay[], today: Date, days = 30): Partial<Record<DiaryTag, number>> {
  const from = toYmd(addDays(today, -(days - 1)));
  const to = toYmd(today);
  const out: Partial<Record<DiaryTag, number>> = {};
  for (const d of diary) {
    if (d.date < from || d.date > to) continue;
    for (const t of new Set(d.tags)) out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}
