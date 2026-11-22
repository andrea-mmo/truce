/**
 * Sync engine: pushes what changed on this device and pulls what changed on
 * the others. Conflicts: the newest change wins (by device time).
 * Detecting changes: each record's hash at the last sync is kept on the
 * device; anything with a different hash (or gone) is sent.
 */
import type { PielDB } from '../db/db';
import { blobToDataUrl, dataUrlToBlob } from '../db/backup';
import { checkVerifier, deriveKey, makeVerifier, open, randomSalt, seal, type Sealed } from './crypto';

export const SYNCED_STORES = ['kv', 'products', 'dailyChecks', 'dailyNotes', 'weeklyLogs', 'photos'] as const;
export type Store = (typeof SYNCED_STORES)[number];
/** kv rows that describe this device, not the person's data. */
const LOCAL_ONLY_KV = new Set(['lastBackupAt']);

export interface PushRecord { store: Store; id: string; modifiedAt: number; deleted: boolean; iv?: string; data?: string }
export interface PulledRecord extends PushRecord { seq: number }
export type Meta = { setup: false } | { setup: true; salt: string; verifierIv: string; verifier: string };

/** The server API, as the engine needs it (the real one is HTTP, tests use a fake). */
export interface SyncTransport {
  meta(): Promise<Meta>;
  init(m: { salt: string; verifierIv: string; verifier: string }): Promise<void>;
  push(records: PushRecord[]): Promise<void>;
  pull(since: number): Promise<{ records: PulledRecord[]; cursor: number; more: boolean }>;
  wipe(): Promise<void>;
}

interface HashEntry { h: string; m: number; d?: boolean }
export interface SyncState {
  enabled: boolean;
  cursor: number;
  hashes: Record<string, HashEntry>;
  lastSyncAt: number | null;
}

/** Where the key and state live (IndexedDB `device` table; memory in tests). */
export interface DeviceStore {
  getKey(): Promise<CryptoKey | null>;
  setKey(k: CryptoKey | null): Promise<void>;
  getState(): Promise<SyncState | null>;
  setState(s: SyncState | null): Promise<void>;
}

export function idbDeviceStore(db: PielDB): DeviceStore {
  return {
    getKey: async () => ((await db.device.get('syncKey'))?.value as CryptoKey | undefined) ?? null,
    setKey: async (k) => { if (k) await db.device.put({ key: 'syncKey', value: k }); else await db.device.delete('syncKey'); },
    getState: async () => ((await db.device.get('sync'))?.value as SyncState | undefined) ?? null,
    setState: async (s) => { if (s) await db.device.put({ key: 'sync', value: s }); else await db.device.delete('sync'); },
  };
}

// ---------------------------------------------------------------- records

const recordId: Record<Store, (r: Record<string, unknown>) => string> = {
  kv: (r) => String(r.key),
  products: (r) => String(r.id),
  dailyChecks: (r) => String(r.date),
  dailyNotes: (r) => String(r.date),
  weeklyLogs: (r) => String(r.week),
  photos: (r) => String(r.id),
};
const primaryKey = (store: Store, id: string): string | number =>
  store === 'products' || store === 'photos' || store === 'weeklyLogs' ? Number(id) : id;

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}

function hashOf(store: Store, value: Record<string, unknown>): string {
  // Photos never change once taken: identity is enough (and cheap).
  if (store === 'photos') return `photo:${value.id}:${value.createdAt}:${value.date}`;
  return fnv1a(JSON.stringify(value));
}

interface LocalRecord { store: Store; id: string; value: Record<string, unknown>; hash: string }

async function collectLocal(db: PielDB): Promise<Map<string, LocalRecord>> {
  const out = new Map<string, LocalRecord>();
  for (const store of SYNCED_STORES) {
    const rows = (await db.table(store).toArray()) as Record<string, unknown>[];
    for (const value of rows) {
      if (store === 'kv' && LOCAL_ONLY_KV.has(String(value.key))) continue;
      const id = recordId[store](value);
      out.set(`${store}/${id}`, { store, id, value, hash: hashOf(store, value) });
    }
  }
  return out;
}

async function encode(store: Store, value: Record<string, unknown>): Promise<string> {
  if (store !== 'photos') return JSON.stringify(value);
  return JSON.stringify({ ...value, blob: await blobToDataUrl(value.blob as Blob), thumb: await blobToDataUrl(value.thumb as Blob) });
}

function decode(store: Store, text: string): Record<string, unknown> {
  const v = JSON.parse(text) as Record<string, unknown>;
  if (store === 'photos') return { ...v, blob: dataUrlToBlob(String(v.blob)), thumb: dataUrlToBlob(String(v.thumb)) };
  return v;
}

const isStore = (s: string): s is Store => (SYNCED_STORES as readonly string[]).includes(s);

// ---------------------------------------------------------------- engine

/** Photos go one per request (they're big); the rest in batches. */
async function pushAll(t: SyncTransport, records: PushRecord[]) {
  const small = records.filter((r) => r.store !== 'photos' || r.deleted);
  const photos = records.filter((r) => r.store === 'photos' && !r.deleted);
  for (let i = 0; i < small.length; i += 100) await t.push(small.slice(i, i + 100));
  for (const p of photos) await t.push([p]);
}

let running: Promise<SyncResult> | null = null;

export type SyncResult = { status: 'off' } | { status: 'ok'; pushed: number; pulled: number };

/** One sync round. Concurrent calls share the same round. */
export function syncOnce(db: PielDB, t: SyncTransport, dev: DeviceStore): Promise<SyncResult> {
  if (!running) running = doSync(db, t, dev).finally(() => { running = null; });
  return running;
}

async function doSync(db: PielDB, t: SyncTransport, dev: DeviceStore): Promise<SyncResult> {
  const state = await dev.getState();
  const key = await dev.getKey();
  if (!state?.enabled || !key) return { status: 'off' };
  const hashes = { ...state.hashes };
  const now = Date.now();

  // 1. What changed here since the last sync.
  const local = await collectLocal(db);
  const out: PushRecord[] = [];
  for (const [k, r] of local) {
    if (hashes[k]?.h === r.hash && !hashes[k]?.d) continue;
    const sealed = await seal(key, await encode(r.store, r.value), k);
    out.push({ store: r.store, id: r.id, modifiedAt: now, deleted: false, ...sealed });
    hashes[k] = { h: r.hash, m: now };
  }
  for (const [k, e] of Object.entries(hashes)) {
    if (local.has(k) || e.d) continue;
    const [store, id] = k.split('/') as [Store, string];
    out.push({ store, id, modifiedAt: now, deleted: true });
    hashes[k] = { h: '', m: now, d: true };
  }
  await pushAll(t, out);

  // 2. What changed elsewhere (includes our own pushes; applying them is a no-op).
  let cursor = state.cursor;
  let pulled = 0;
  for (;;) {
    const page = await t.pull(cursor);
    for (const r of page.records) {
      if (!isStore(r.store)) continue;
      const k = `${r.store}/${r.id}`;
      const mine = hashes[k];
      if (mine && mine.m > r.modifiedAt) continue; // a newer local change is on its way
      const table = db.table(r.store);
      if (r.deleted) {
        await table.delete(primaryKey(r.store, r.id));
        hashes[k] = { h: '', m: r.modifiedAt, d: true };
      } else {
        const value = decode(r.store, await open(key, r as Sealed, k));
        await table.put(value);
        hashes[k] = { h: hashOf(r.store, value), m: r.modifiedAt };
      }
      pulled++;
    }
    cursor = page.cursor;
    if (!page.more) break;
  }

  await dev.setState({ enabled: true, cursor, hashes, lastSyncAt: Date.now() });
  return { status: 'ok', pushed: out.length, pulled };
}

// ---------------------------------------------------------------- setup

export class WrongPassphrase extends Error { constructor() { super('wrong-passphrase'); } }

/**
 * Turns sync on for this device.
 * - First device: creates the cloud space and uploads everything.
 * - Other devices: checks the passphrase and REPLACES local data with the cloud's.
 */
export async function enableSync(db: PielDB, t: SyncTransport, dev: DeviceStore, passphrase: string): Promise<'created' | 'joined'> {
  const meta = await t.meta();
  if (!meta.setup) {
    const salt = randomSalt();
    const key = await deriveKey(passphrase, salt);
    const v = await makeVerifier(key);
    await t.init({ salt, verifierIv: v.iv, verifier: v.data });
    await dev.setKey(key);
    await dev.setState({ enabled: true, cursor: 0, hashes: {}, lastSyncAt: null });
    await syncOnce(db, t, dev);
    return 'created';
  }

  const key = await deriveKey(passphrase, meta.salt);
  if (!(await checkVerifier(key, { iv: meta.verifierIv, data: meta.verifier }))) throw new WrongPassphrase();

  // Download everything first; only then replace local data, in one go.
  const latest = new Map<string, PulledRecord>();
  let cursor = 0;
  for (;;) {
    const page = await t.pull(cursor);
    for (const r of page.records) if (isStore(r.store)) latest.set(`${r.store}/${r.id}`, r);
    cursor = page.cursor;
    if (!page.more) break;
  }
  const rows = new Map<Store, Record<string, unknown>[]>();
  const hashes: Record<string, HashEntry> = {};
  for (const [k, r] of latest) {
    const store = r.store as Store;
    if (r.deleted) { hashes[k] = { h: '', m: r.modifiedAt, d: true }; continue; }
    const value = decode(store, await open(key, r as Sealed, k));
    rows.set(store, [...(rows.get(store) ?? []), value]);
    hashes[k] = { h: hashOf(store, value), m: r.modifiedAt };
  }
  await db.transaction('rw', SYNCED_STORES.map((s) => db.table(s)), async () => {
    for (const s of SYNCED_STORES) {
      const keep = s === 'kv' ? await db.kv.where('key').anyOf([...LOCAL_ONLY_KV]).toArray() : [];
      await db.table(s).clear();
      await db.table(s).bulkPut([...(rows.get(s) ?? []), ...keep]);
    }
  });
  await dev.setKey(key);
  await dev.setState({ enabled: true, cursor, hashes, lastSyncAt: Date.now() });
  return 'joined';
}

/** Stops syncing on this device. Its data and the cloud's stay as they are. */
export async function disableSync(dev: DeviceStore) {
  await dev.setKey(null);
  await dev.setState(null);
}

/** Deletes the cloud copy (e.g. a forgotten passphrase) and stops syncing here. */
export async function wipeCloud(t: SyncTransport, dev: DeviceStore) {
  await t.wipe();
  await disableSync(dev);
}
