// @vitest-environment node
import Dexie from 'dexie';
import { PielDB } from './db';
import { LEGACY_PROFILE_NAME } from '../data/seed';

it('v8 prefills a profile from the existing data, pending review', async () => {
  const name = 'piel-profile-mig';
  await Dexie.delete(name);
  const old = new Dexie(name);
  old.version(7).stores({ kv: 'key', dailyChecks: 'date', weeklyLogs: 'week', dailyNotes: 'date', photos: '++id, date', products: '++id, status, category', device: 'key' });
  await old.open();
  await old.table('kv').bulkAdd([
    { key: 'settings', value: { start: '2026-11-21', climb: [2, 6], ret: null, gly: [3, 0] } },
    { key: 'triage', value: ['T1'] },
  ]);
  old.close();
  const db = new PielDB(name);
  await db.open();
  expect((await db.kv.get('profile'))?.value).toMatchObject({
    name: LEGACY_PROFILE_NAME, sportDays: [2, 6], makeup: 'occasional', reviewedAt: null,
    triage: { T1: 'yes', T2: null, T3: null, T4: null, T5: null },
  });
  db.close();
});
