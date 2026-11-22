// @vitest-environment node
import { PielDB } from '../db/db';
import { SEED_PRODUCTS } from '../data/seed';
import { checkVerifier, deriveKey, makeVerifier, open, seal } from './crypto';
import {
  disableSync, enableSync, syncOnce, WrongPassphrase,
  type DeviceStore, type Meta, type PulledRecord, type PushRecord, type SyncState, type SyncTransport,
} from './sync';

/** In-memory server with the same rules as functions/api/sync: seq order, newest change wins. */
class FakeServer implements SyncTransport {
  meta_: Meta = { setup: false };
  rows = new Map<string, PulledRecord>();
  seq = 0;
  pageSize = 7;
  async meta() { return this.meta_; }
  async init(m: { salt: string; verifierIv: string; verifier: string }) {
    if (this.meta_.setup) throw new Error('already');
    this.meta_ = { setup: true, ...m };
  }
  async push(records: PushRecord[]) {
    for (const r of records) {
      const k = `${r.store}/${r.id}`;
      const cur = this.rows.get(k);
      this.seq += 1;
      if (!cur || r.modifiedAt >= cur.modifiedAt) this.rows.set(k, { ...r, seq: this.seq });
    }
  }
  async pull(since: number) {
    const all = [...this.rows.values()].filter((r) => r.seq > since).sort((a, b) => a.seq - b.seq);
    const page = all.slice(0, this.pageSize);
    return { records: page, cursor: page.length ? page[page.length - 1].seq : since, more: all.length > this.pageSize };
  }
  async wipe() { this.rows.clear(); this.meta_ = { setup: false }; this.seq = 0; }
}

function memoryDevice(): DeviceStore {
  let key: CryptoKey | null = null;
  let state: SyncState | null = null;
  return {
    getKey: async () => key, setKey: async (k) => { key = k; },
    getState: async () => state, setState: async (s) => { state = s ? structuredClone(s) : null; },
  };
}

let n = 0;
async function device() {
  const db = new PielDB(`piel-sync-test-${n++}`);
  await db.open();
  return { db, dev: memoryDevice() };
}

describe('crypto', () => {
  it('round trip, bound to the record, wrong key fails', async () => {
    const k = await deriveKey('frase secreta', 'AAAAAAAAAAAAAAAAAAAAAA==');
    const s = await seal(k, 'hola', 'kv/settings');
    expect(s.data).not.toContain('hola');
    expect(await open(k, s, 'kv/settings')).toBe('hola');
    await expect(open(k, s, 'kv/otro')).rejects.toThrow();
    const other = await deriveKey('otra frase', 'AAAAAAAAAAAAAAAAAAAAAA==');
    expect(await checkVerifier(other, await makeVerifier(k))).toBe(false);
    expect(await checkVerifier(k, await makeVerifier(k))).toBe(true);
  });
});

describe('sync between two devices', () => {
  it('first device uploads; second joins and gets everything; changes flow both ways', async () => {
    const server = new FakeServer();
    const a = await device();
    await a.db.dailyNotes.put({ date: '2026-11-21', note: 'Desde el Mac', tags: ['picked'], updatedAt: 1 });
    await a.db.photos.add({ id: 999, date: '2026-11-21', blob: new Blob(['jpg'], { type: 'image/jpeg' }), thumb: new Blob(['t'], { type: 'image/jpeg' }), w: 1, h: 1, createdAt: 5 });
    expect(await enableSync(a.db, server, a.dev, 'mi frase')).toBe('created');
    // Nothing readable on the server.
    expect(JSON.stringify([...server.rows.values()])).not.toContain('Desde el Mac');

    const b = await device();
    await b.db.dailyNotes.put({ date: '2020-01-01', note: 'solo en el móvil (se sustituye)', updatedAt: 1 });
    expect(await enableSync(b.db, server, b.dev, 'mi frase')).toBe('joined');
    expect(await b.db.dailyNotes.toArray()).toEqual([{ date: '2026-11-21', note: 'Desde el Mac', tags: ['picked'], updatedAt: 1 }]);
    expect(await b.db.products.count()).toBe(SEED_PRODUCTS.length);
    expect(await (await b.db.photos.get(999))!.blob.text()).toBe('jpg');

    // Change on B → appears on A.
    await b.db.dailyChecks.put({ date: '2026-11-22', checks: { pm_led: true } });
    await b.db.products.update(3, { status: 'removed' });
    await syncOnce(b.db, server, b.dev);
    await syncOnce(a.db, server, a.dev);
    expect((await a.db.dailyChecks.get('2026-11-22'))?.checks).toEqual({ pm_led: true });
    expect((await a.db.products.get(3))?.status).toBe('removed');

    // Delete on A → gone on B.
    await a.db.dailyNotes.delete('2026-11-21');
    await syncOnce(a.db, server, a.dev);
    await syncOnce(b.db, server, b.dev);
    expect(await b.db.dailyNotes.count()).toBe(0);

    // A second round with no changes pushes nothing.
    const r = await syncOnce(a.db, server, a.dev);
    expect(r).toMatchObject({ status: 'ok', pushed: 0 });
  });

  it('wrong passphrase on the second device is refused and changes nothing', async () => {
    const server = new FakeServer();
    const a = await device();
    await enableSync(a.db, server, a.dev, 'buena');
    const b = await device();
    await b.db.dailyNotes.put({ date: '2026-01-01', note: 'intacta', updatedAt: 1 });
    await expect(enableSync(b.db, server, b.dev, 'mala')).rejects.toBeInstanceOf(WrongPassphrase);
    expect(await b.db.dailyNotes.count()).toBe(1);
    expect(await b.dev.getState()).toBeNull();
  });

  it('same record changed on both: the newest change wins', async () => {
    const server = new FakeServer();
    const a = await device();
    await enableSync(a.db, server, a.dev, 'f');
    const b = await device();
    await enableSync(b.db, server, b.dev, 'f');

    await a.db.dailyNotes.put({ date: '2026-11-23', note: 'A, antes', updatedAt: 1 });
    await syncOnce(a.db, server, a.dev);
    await new Promise((r) => setTimeout(r, 5));
    await b.db.dailyNotes.put({ date: '2026-11-23', note: 'B, después', updatedAt: 2 });
    await syncOnce(b.db, server, b.dev);
    await syncOnce(a.db, server, a.dev);
    expect((await a.db.dailyNotes.get('2026-11-23'))?.note).toBe('B, después');
    expect((await b.db.dailyNotes.get('2026-11-23'))?.note).toBe('B, después');
  });

  it('off: nothing happens until enabled; disabling keeps local data', async () => {
    const server = new FakeServer();
    const a = await device();
    expect(await syncOnce(a.db, server, a.dev)).toEqual({ status: 'off' });
    await enableSync(a.db, server, a.dev, 'f');
    await disableSync(a.dev);
    expect(await syncOnce(a.db, server, a.dev)).toEqual({ status: 'off' });
    expect(await a.db.products.count()).toBe(SEED_PRODUCTS.length);
  });
});
