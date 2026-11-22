import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { SEED_TRIAGE, seedSettings } from '../data/seed';
import {
  toYmd, triageFromProfile, type Challenge, type DiaryDay, type DiaryTag, type PlanState, type Profile, type ResetVerdict,
  type Settings, type TriageId,
} from '../engine';
import { db, type DailyNote, type WeeklyLog } from './db';
import { newId } from './ids';

export interface AppData {
  plan: PlanState;
  /** Alarm signals: from the profile when there is one, else the old fixed list. */
  triage: TriageId[];
  profile: Profile | null;
  /** Frozen D4 order (product keys); null until computed the first time. */
  reintroQueue: string[] | null;
}

async function getKv<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined;
}

export function setKv(key: string, value: unknown) {
  return db.kv.put({ key, value });
}

export const saveSettings = (s: Settings) => setKv('settings', s);
export const saveReintro = (r: PlanState['reintro']) => setKv('reintro', r);
export const saveVerdict = (v: ResetVerdict) => setKv('resetVerdict', v);
export const saveReintroQueue = (q: string[]) => setKv('reintroQueue', q);

/** D5: end of a trial. "ok" → the product stays in use; "bad" → removed. */
export async function saveTrialResult(reintro: PlanState['reintro'], key: string, result: 'ok' | 'bad') {
  await db.transaction('rw', db.kv, db.products, async () => {
    await setKv('reintro', { ...reintro, [key]: result });
    const id = Number(key.replace(/^p/, ''));
    if (Number.isFinite(id)) await db.products.update(id, { status: result === 'ok' ? 'active' : 'removed', updatedAt: Date.now() });
  });
}

/** Loads the plan (seeded on first run, see db.ts). */
export function useAppData(): AppData | undefined {
  return useLiveQuery(async () => {
    const settings = (await getKv<Settings>('settings')) ?? seedSettings(toYmd(new Date()));
    const profile = (await getKv<Profile>('profile')) ?? null;
    const triage = profile ? triageFromProfile(profile) : (await getKv<TriageId[]>('triage')) ?? SEED_TRIAGE;
    return {
      plan: {
        settings,
        reintro: (await getKv<PlanState['reintro']>('reintro')) ?? {},
        resetVerdict: (await getKv<ResetVerdict>('resetVerdict')) ?? null,
      },
      triage,
      profile,
      reintroQueue: (await getKv<string[]>('reintroQueue')) ?? null,
    };
  });
}

export function useChecks(date: string): Record<string, boolean> {
  return useLiveQuery(async () => (await db.dailyChecks.get(date))?.checks ?? {}, [date]) ?? {};
}

export function saveChecks(date: string, checks: Record<string, boolean>) {
  return db.dailyChecks.put({ date, checks });
}

export function useWeeklyLogs(): WeeklyLog[] {
  return useLiveQuery(() => db.weeklyLogs.orderBy('week').toArray()) ?? [];
}

export function saveWeeklyLog(log: WeeklyLog) {
  return db.weeklyLogs.put(log);
}

/** Current date; re-renders after midnight if the app is left open. */
export function useToday(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow((prev) => (toYmd(prev) === toYmd(n) && prev.getHours() === n.getHours() ? prev : n));
    };
    const id = setInterval(tick, 60_000);
    // Phones freeze timers while the app is in the background: refresh as soon as it's back.
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);
  return now;
}

export function useDailyNote(date: string): DailyNote | null | undefined {
  // undefined while loading, null when there's no note for that day
  return useLiveQuery(async () => (await db.dailyNotes.get(date)) ?? null, [date]);
}

export function useRecentNotes(limit = 5): DailyNote[] {
  return useLiveQuery(() => db.dailyNotes.orderBy('date').reverse().limit(limit).toArray(), [limit]) ?? [];
}

/** Empty note → the entry is removed. */
/** Saves the text and/or the tags of a day; an entry with neither is removed. */
async function saveDailyEntry(date: string, patch: { note?: string; tags?: DiaryTag[] }) {
  await db.transaction('rw', db.dailyNotes, async () => {
    const cur = await db.dailyNotes.get(date);
    const note = patch.note ?? cur?.note ?? '';
    const tags = patch.tags ?? cur?.tags ?? [];
    if (!note.trim() && tags.length === 0) await db.dailyNotes.delete(date);
    else await db.dailyNotes.put({ date, note, tags, updatedAt: Date.now() });
  });
}

export const saveDailyNote = (date: string, note: string) => saveDailyEntry(date, { note });
export const saveDailyTags = (date: string, tags: DiaryTag[]) => saveDailyEntry(date, { tags });

/** Diary entries of the last `days` days (tags only), for tips and alarms. */
export function useRecentDiary(today: Date, days = 31): DiaryDay[] {
  const from = toYmd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)));
  return useLiveQuery(
    async () => (await db.dailyNotes.where('date').aboveOrEqual(from).toArray()).map((n) => ({ date: n.date, tags: n.tags ?? [] })),
    [from],
  ) ?? [];
}

export function useAllChecks(): Record<string, Record<string, boolean>> | undefined {
  return useLiveQuery(async () => {
    const rows = await db.dailyChecks.toArray();
    return Object.fromEntries(rows.map((r) => [r.date, r.checks]));
  });
}

export function useNoteDates(): string[] {
  return useLiveQuery(() => db.dailyNotes.toCollection().primaryKeys()) ?? [];
}

export function useChallenge(): Challenge | null | undefined {
  return useLiveQuery(async () => (await getKv<Challenge>('challenge')) ?? null);
}

export const saveChallenge = (c: Challenge | null) => (c ? setKv('challenge', c) : db.kv.delete('challenge'));

export function useProducts() {
  return useLiveQuery(() => db.products.toArray());
}

export function saveProduct(p: import('../engine').Product) {
  const now = Date.now();
  return p.id
    ? db.products.put({ ...p, updatedAt: now })
    : db.products.add({ ...p, id: newId(), createdAt: now, updatedAt: now });
}

/** Deletes a product and takes it out of the reintroduction queue if it was there. */
export async function deleteProduct(id: number) {
  await db.transaction('rw', db.kv, db.products, async () => {
    const queue = ((await db.kv.get('reintroQueue'))?.value as string[] | undefined) ?? null;
    if (queue?.includes(`p${id}`)) await db.kv.put({ key: 'reintroQueue', value: queue.filter((k) => k !== `p${id}`) });
    await db.products.delete(id);
  });
}

/** Every diary day (tags only), for points that depend on past tags. */
export function useAllDiary(): DiaryDay[] {
  return useLiveQuery(async () => (await db.dailyNotes.toArray()).map((n) => ({ date: n.date, tags: n.tags ?? [] }))) ?? [];
}

export const saveProfile = (p: Profile) => setKv('profile', p);

/** Adds a product to the end of the reintroduction queue (D4), paused until its turn. */
export async function queueProduct(id: number) {
  await db.transaction('rw', db.kv, db.products, async () => {
    const queue = ((await db.kv.get('reintroQueue'))?.value as string[] | undefined) ?? [];
    const key = `p${id}`;
    if (!queue.includes(key)) await db.kv.put({ key: 'reintroQueue', value: [...queue, key] });
    await db.products.update(id, { status: 'paused', updatedAt: Date.now() });
  });
}

/** Starts a 2-week trial today (D4). */
export const startTrial = (id: number) =>
  db.products.update(id, { status: 'trial', trialStart: toYmd(new Date()), updatedAt: Date.now() });

export const setProductStatus = (id: number, status: 'active' | 'paused') =>
  db.products.update(id, { status, updatedAt: Date.now() });
