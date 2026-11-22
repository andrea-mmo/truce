import Dexie, { type EntityTable } from 'dexie';
import { LEGACY_PROFILE_NAME, LEGACY_STEP_PRODUCTS, LEGACY_TRIALS, SEED_PRODUCTS, SEED_PROFILE, SEED_TRIAGE, seedSettings } from '../data/seed';
import { isSummer, parseYmd } from '../engine/dates';
import { productKey, routineDefaults, type Product } from '../engine/products';
import { emptyProfile, type Profile } from '../engine/profile';
import type { DiaryTag } from '../engine/diary';
import { toYmd } from '../engine/dates';

/** Everything stays on this device (local-first, CLAUDE.md principle 4). */
export interface KvRow { key: string; value: unknown }
export interface DailyChecks { date: string; checks: Record<string, boolean> }
export interface DailyNote {
  date: string;
  note: string;
  /** Fixed diary tags (REGLAS.md → F). Optional: older entries have none. */
  tags?: DiaryTag[];
  updatedAt: number;
}
/**
 * Skin photo. Health data: stays in IndexedDB on this device, never uploaded.
 * Re-encoded through a canvas, which also drops EXIF metadata (GPS, device).
 */
export interface Photo {
  id?: number;
  date: string;
  blob: Blob;
  thumb: Blob;
  w: number;
  h: number;
  createdAt: number;
}
export interface WeeklyLog {
  week: number;
  comedones: number | null;
  jaw: number | null;
  irritation: number | null;
  note: string;
}

export class PielDB extends Dexie {
  kv!: EntityTable<KvRow, 'key'>;
  dailyChecks!: EntityTable<DailyChecks, 'date'>;
  weeklyLogs!: EntityTable<WeeklyLog, 'week'>;
  dailyNotes!: EntityTable<DailyNote, 'date'>;
  photos!: EntityTable<Photo, 'id'>;
  products!: EntityTable<Product, 'id'>;
  /** Per-device state (sync key and cursor). Never synced or backed up. */
  device!: EntityTable<KvRow, 'key'>;

  constructor(name = 'piel') {
    super(name);
    this.version(1).stores({ kv: 'key', dailyChecks: 'date', weeklyLogs: 'week' });
    this.version(2).stores({ dailyNotes: 'date' });
    this.version(3).stores({ photos: '++id, date' });
    // Product library, seeded with the starting products (also for existing installs).
    this.version(4).stores({ products: '++id, status, category' }).upgrade(async (tx) => {
      if ((await tx.table('products').count()) === 0) await tx.table('products').bulkAdd(seedProducts());
    });
    // Fix: the summer cream was seeded as paused. Only if the person hasn't edited it.
    this.version(5).stores({}).upgrade((tx) =>
      tx.table('products')
        .filter((p: Product) => p.brand === 'Medicube' && p.status === 'paused' && p.createdAt === p.updatedAt)
        .modify({ status: 'active' }));
    // Sync state that belongs to this device only.
    this.version(7).stores({ device: 'key' });
    // Skin quiz: existing installs get a profile prefilled from what they had
    // (pending review), so nothing changes until the person checks it.
    this.version(8).stores({}).upgrade(async (tx) => {
      const kv = tx.table('kv');
      if (await kv.get('profile')) return;
      const triage = ((await kv.get('triage'))?.value ?? []) as string[];
      const settings = (await kv.get('settings'))?.value as { climb?: number[] } | undefined;
      if (!settings) return;
      const p = emptyProfile();
      p.name = LEGACY_PROFILE_NAME;
      p.sportDays = (settings.climb ?? []) as Profile['sportDays'];
      p.makeup = 'occasional';
      p.triage.T1 = triage.includes('T1') ? 'yes' : null;
      await kv.put({ key: 'profile', value: p });
    });
    // "Hoy" built from the library: routine fields on products, plan keyed by
    // product, and old check marks moved to the product they meant.
    this.version(6).stores({}).upgrade(async (tx) => {
      const products = (await tx.table('products').toArray()) as (Product & { id: number })[];
      const find = (m?: [string, string]) => m && products.find((p) => p.brand === m[0] && p.name.startsWith(m[1]));

      for (const p of products) {
        if (p.am !== undefined) continue;
        const seed = SEED_PRODUCTS.find((x) => x.brand === p.brand && x.name === p.name);
        const fields = seed
          ? { am: seed.am, pm: seed.pm, season: seed.season, order: seed.order, howTo: seed.howTo }
          : routineDefaults(p.category);
        await tx.table('products').update(p.id, fields);
      }

      const kv = tx.table('kv');
      const legacyQueue = ['snail', 'gly', 'fresh', 'anua'].map((k) => find(LEGACY_TRIALS[k]));
      if (!(await kv.get('reintroQueue')) && legacyQueue.every(Boolean)) {
        await kv.put({ key: 'reintroQueue', value: legacyQueue.map((p) => productKey(p!.id)) });
      }
      const oldReintro = ((await kv.get('reintro'))?.value ?? {}) as Record<string, string>;
      const reintro: Record<string, string> = {};
      for (const [k, v] of Object.entries(oldReintro)) {
        const p = find(LEGACY_TRIALS[k]);
        reintro[p ? productKey(p.id) : k] = v;
      }
      await kv.put({ key: 'reintro', value: reintro });

      const key = (m: [string, string]) => { const p = find(m); return p ? productKey(p.id) : null; };
      const cosrx = key(['COSRX', 'Low pH']);
      const q1 = key(['Quality 1st', 'Derma Laser']);
      const medicube = key(['Medicube', 'Collagen']);
      await tx.table('dailyChecks').toCollection().modify((row: DailyChecks) => {
        const out: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(row.checks)) {
          const bare = k.replace(/^skip:/, '');
          const prefix = k.startsWith('skip:') ? 'skip:' : '';
          let next: string | null = k;
          if (LEGACY_STEP_PRODUCTS[bare]) next = key(LEGACY_STEP_PRODUCTS[bare]) && `am:${key(LEGACY_STEP_PRODUCTS[bare])}`;
          else if (bare === 'am_cream') next = (isSummer(parseYmd(row.date)) ? medicube : q1) && `am:${isSummer(parseYmd(row.date)) ? medicube : q1}`;
          else if (bare === 'pm_c1') next = cosrx && `pm1:${cosrx}`;
          else if (bare === 'pm_c2') next = cosrx && `pm2:${cosrx}`;
          else if (bare === 'pm_cream') next = q1 && `pm:${q1}`;
          if (next) out[next.startsWith('skip:') ? next : prefix + next] = v;
        }
        row.checks = out;
      });
    });
    // First run: seed with the starting case (data/seed.ts), starting the reset today.
    this.on('populate', (tx) => {
      tx.table('kv').bulkAdd([
        { key: 'settings', value: seedSettings(toYmd(new Date())) },
        { key: 'triage', value: SEED_TRIAGE },
        ...(SEED_PROFILE ? [{ key: 'profile', value: SEED_PROFILE }] : []),
      ]);
      tx.table('products').bulkAdd(seedProducts());
    });
  }
}

export const db = new PielDB();

function seedProducts(): Product[] {
  const now = Date.now();
  return SEED_PRODUCTS.map((p, i) => ({ ...p, createdAt: now + i, updatedAt: now + i }));
}
