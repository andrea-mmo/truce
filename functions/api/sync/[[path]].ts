/**
 * Encrypted sync API. The server never sees readable data: records arrive
 * already encrypted on the device (AES-GCM) and are stored as-is.
 *
 *   GET    /api/sync/meta          → { setup, salt, verifierIv, verifier }
 *   POST   /api/sync/init          ← { salt, verifierIv, verifier }  (first device only)
 *   POST   /api/sync/push          ← { records: [...] }  → { cursor }
 *   GET    /api/sync/pull?since=N  → { records: [...], cursor, more }
 *   DELETE /api/sync               → wipes this person's cloud data
 */
import { accessEmail, type AccessEnv } from '../../_access';

interface Env extends AccessEnv {
  DB: D1Database;
}

interface IncomingRecord {
  store: string;
  id: string;
  modifiedAt: number;
  deleted: boolean;
  iv?: string | null;
  data?: string | null;
}

const STORES = new Set(['kv', 'products', 'dailyChecks', 'dailyNotes', 'weeklyLogs', 'photos']);
const MAX_PULL = 25;
const MAX_PUSH = 200;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function validRecord(r: IncomingRecord): boolean {
  return typeof r === 'object' && r !== null && STORES.has(r.store) && typeof r.id === 'string' && r.id.length > 0 && r.id.length <= 64
    && Number.isFinite(r.modifiedAt) && typeof r.deleted === 'boolean'
    && (r.deleted || (typeof r.iv === 'string' && typeof r.data === 'string'));
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const email = await accessEmail(request, env);
  if (!email) return json({ error: 'unauthorized' }, 401);

  const path = ((params.path as string[] | undefined) ?? []).join('/');
  const db = env.DB;

  if (request.method === 'GET' && path === 'meta') {
    const u = await db.prepare('SELECT salt, verifier_iv, verifier FROM sync_users WHERE email = ?')
      .bind(email).first<{ salt: string; verifier_iv: string; verifier: string }>();
    return json(u ? { setup: true, salt: u.salt, verifierIv: u.verifier_iv, verifier: u.verifier } : { setup: false });
  }

  if (request.method === 'POST' && path === 'init') {
    const b = (await request.json()) as { salt?: string; verifierIv?: string; verifier?: string };
    if (!b.salt || !b.verifierIv || !b.verifier) return json({ error: 'bad-request' }, 400);
    const res = await db.prepare('INSERT OR IGNORE INTO sync_users (email, salt, verifier_iv, verifier, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(email, b.salt, b.verifierIv, b.verifier, Date.now()).run();
    if (!res.meta.changes) return json({ error: 'already-setup' }, 409);
    return json({ ok: true });
  }

  if (request.method === 'POST' && path === 'push') {
    const b = (await request.json()) as { records?: IncomingRecord[] };
    const records = b.records ?? [];
    if (!Array.isArray(records) || records.length > MAX_PUSH || !records.every(validRecord)) return json({ error: 'bad-request' }, 400);
    const user = await db.prepare('SELECT 1 FROM sync_users WHERE email = ?').bind(email).first();
    if (!user) return json({ error: 'not-setup' }, 409);
    const counter = await db.prepare('SELECT seq FROM sync_counters WHERE email = ?').bind(email).first<{ seq: number }>();
    let seq = counter?.seq ?? 0;
    const stmts = records.map((r) => {
      seq += 1;
      // Newest change wins: an older record never overwrites a newer one.
      return db.prepare(
        `INSERT INTO sync_records (email, store, id, seq, modified_at, deleted, iv, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (email, store, id) DO UPDATE SET seq = excluded.seq, modified_at = excluded.modified_at,
           deleted = excluded.deleted, iv = excluded.iv, data = excluded.data
         WHERE excluded.modified_at >= sync_records.modified_at`,
      ).bind(email, r.store, r.id, seq, r.modifiedAt, r.deleted ? 1 : 0, r.deleted ? null : r.iv, r.deleted ? null : r.data);
    });
    stmts.push(db.prepare('INSERT INTO sync_counters (email, seq) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET seq = excluded.seq').bind(email, seq));
    await db.batch(stmts);
    return json({ ok: true, cursor: seq });
  }

  if (request.method === 'GET' && path === 'pull') {
    const since = Number(new URL(request.url).searchParams.get('since') ?? 0) || 0;
    const rows = await db.prepare(
      'SELECT store, id, seq, modified_at, deleted, iv, data FROM sync_records WHERE email = ? AND seq > ? ORDER BY seq LIMIT ?',
    ).bind(email, since, MAX_PULL + 1)
      .all<{ store: string; id: string; seq: number; modified_at: number; deleted: number; iv: string | null; data: string | null }>();
    const list = rows.results ?? [];
    const page = list.slice(0, MAX_PULL);
    return json({
      records: page.map((r) => ({ store: r.store, id: r.id, seq: r.seq, modifiedAt: r.modified_at, deleted: !!r.deleted, iv: r.iv, data: r.data })),
      cursor: page.length ? page[page.length - 1].seq : since,
      more: list.length > MAX_PULL,
    });
  }

  if (request.method === 'DELETE' && path === '') {
    await db.batch([
      db.prepare('DELETE FROM sync_records WHERE email = ?').bind(email),
      db.prepare('DELETE FROM sync_counters WHERE email = ?').bind(email),
      db.prepare('DELETE FROM sync_users WHERE email = ?').bind(email),
    ]);
    return json({ ok: true });
  }

  return json({ error: 'not-found' }, 404);
};
