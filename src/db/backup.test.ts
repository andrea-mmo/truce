// @vitest-environment node
// Node environment: real Blob objects survive IndexedDB like in a browser (jsdom ones don't).
import { PielDB } from './db';
import { SEED_PRODUCTS } from '../data/seed';
import { BackupError, createBackup, parseBackup, restoreBackup, summarize } from './backup';

let n = 0;
async function freshDb() {
  const d = new PielDB(`piel-backup-test-${n++}`);
  await d.open(); // populate seeds settings, triage and the starting products
  return d;
}

describe('backup', () => {
  it('round trip: export from one device, restore on another', async () => {
    const a = await freshDb();
    await a.dailyChecks.put({ date: '2026-11-21', checks: { pm_led: true } });
    await a.dailyNotes.put({ date: '2026-11-21', note: 'Dos comedones', updatedAt: 1 });
    await a.weeklyLogs.put({ week: 1, comedones: 2, jaw: 1, irritation: 0, note: '' });
    await a.photos.add({ date: '2026-11-21', blob: new Blob(['full'], { type: 'image/jpeg' }), thumb: new Blob(['th'], { type: 'image/jpeg' }), w: 10, h: 20, createdAt: 5 });

    const file = parseBackup(JSON.stringify(await createBackup({ includePhotos: true, theme: 'clinico' }, a)), a);
    expect(summarize(file)).toMatchObject({ products: SEED_PRODUCTS.length, days: 1, notes: 1, weeks: 1, photos: 1, includesPhotos: true });

    const b = await freshDb();
    await b.dailyNotes.put({ date: '2020-01-01', note: 'se borra', updatedAt: 1 });
    await b.kv.put({ key: 'lastBackupAt', value: '2026-11-20T10:00:00.000Z' });
    await restoreBackup(file, b);
    expect((await b.kv.get('lastBackupAt'))?.value).toBe('2026-11-20T10:00:00.000Z');
    expect(await b.dailyNotes.toArray()).toEqual([{ date: '2026-11-21', note: 'Dos comedones', updatedAt: 1 }]);
    expect((await b.dailyChecks.get('2026-11-21'))?.checks).toEqual({ pm_led: true });
    const [photo] = await b.photos.toArray();
    expect(photo).toMatchObject({ date: '2026-11-21', w: 10, h: 20 });
    expect(photo.blob.type).toBe('image/jpeg');
    expect(await photo.blob.text()).toBe('full');
    expect(await b.products.count()).toBe(SEED_PRODUCTS.length);
  });

  it('a backup without photos keeps the photos on the device', async () => {
    const a = await freshDb();
    const file = await createBackup({ includePhotos: false }, a);
    const b = await freshDb();
    await b.photos.add({ date: '2026-11-21', blob: new Blob(['x']), thumb: new Blob(['y']), w: 1, h: 1, createdAt: 1 });
    await restoreBackup(file, b);
    expect(await b.photos.count()).toBe(1);
  });

  it('rejects files that are not a backup, or from another version', async () => {
    const a = await freshDb();
    const code = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as BackupError).code; } return 'ok'; };
    expect(code(() => parseBackup('hola', a))).toBe('not-json');
    expect(code(() => parseBackup('{"app":"otra"}', a))).toBe('not-piel');
    const good = await createBackup({ includePhotos: false }, a);
    expect(code(() => parseBackup(JSON.stringify({ ...good, schema: good.schema + 1 }), a))).toBe('newer');
    expect(code(() => parseBackup(JSON.stringify({ ...good, schema: 5 }), a))).toBe('older');
    expect(code(() => parseBackup(JSON.stringify({ ...good, schema: 6 }), a))).toBe('ok');
    expect(code(() => parseBackup(JSON.stringify({ ...good, tables: { ...good.tables, kv: [] } }), a))).toBe('broken');
    expect(code(() => parseBackup(JSON.stringify(good), a))).toBe('ok');
  });
});
