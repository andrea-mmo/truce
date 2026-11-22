import type { Meta, PulledRecord, PushRecord, SyncTransport } from './sync';

export class SyncHttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  // Same origin: the Cloudflare Access cookie goes along automatically.
  const res = await fetch(`/api/sync${path}`, { credentials: 'same-origin', ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) {
    let code = 'http';
    try { code = ((await res.json()) as { error?: string }).error ?? code; } catch { /* not JSON (e.g. Access login page) */ }
    throw new SyncHttpError(res.status, res.redirected ? 'login' : code);
  }
  return (await res.json()) as T;
}

export const httpTransport: SyncTransport = {
  meta: () => call<Meta>('/meta'),
  init: async (m) => { await call('/init', { method: 'POST', body: JSON.stringify(m) }); },
  push: async (records: PushRecord[]) => { await call('/push', { method: 'POST', body: JSON.stringify({ records }) }); },
  pull: (since: number) => call<{ records: PulledRecord[]; cursor: number; more: boolean }>(`/pull?since=${since}`),
  wipe: async () => { await call('', { method: 'DELETE' }); },
};
