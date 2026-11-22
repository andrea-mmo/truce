/**
 * Runs sync automatically while sync is on: when the app opens, when it comes
 * back to the screen, a couple of seconds after any change, and every minute.
 */
import Dexie from 'dexie';
import { useEffect, useSyncExternalStore } from 'react';
import { db } from '../db/db';
import { httpTransport, SyncHttpError } from './http';
import { idbDeviceStore, syncOnce } from './sync';

export type SyncStatus =
  | { kind: 'off' }
  | { kind: 'syncing' }
  | { kind: 'ok'; at: number }
  | { kind: 'offline' }
  /** login = the Access session expired. Words in src/i18n (sync.statusError). */
  | { kind: 'error'; reason: 'login' | 'failed' };

let status: SyncStatus = { kind: 'off' };
const listeners = new Set<() => void>();
const set = (s: SyncStatus) => { status = s; listeners.forEach((l) => l()); };

export const device = idbDeviceStore(db);

export async function runSync(): Promise<void> {
  if (!navigator.onLine) { set({ kind: 'offline' }); return; }
  const state = await device.getState();
  if (!state?.enabled) { set({ kind: 'off' }); return; }
  set({ kind: 'syncing' });
  try {
    const r = await syncOnce(db, httpTransport, device);
    set(r.status === 'off' ? { kind: 'off' } : { kind: 'ok', at: Date.now() });
  } catch (e) {
    if (e instanceof SyncHttpError && (e.status === 401 || e.code === 'login')) set({ kind: 'error', reason: 'login' });
    else if (!navigator.onLine || e instanceof TypeError) set({ kind: 'offline' });
    else set({ kind: 'error', reason: 'failed' });
  }
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => status);
}

const DEBOUNCE_MS = 2000;
const EVERY_MS = 60_000;

export function useAutoSync() {
  useEffect(() => {
    let timer: number | undefined;
    const soon = () => { clearTimeout(timer); timer = window.setTimeout(runSync, DEBOUNCE_MS); };
    // Any change to synced data (not the device's own sync state) schedules a sync.
    const onMutated = (parts: Record<string, unknown>) => {
      if (Object.keys(parts).some((k) => k.includes('/piel/') && !k.includes('/device/'))) soon();
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void runSync(); };
    Dexie.on('storagemutated', onMutated);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    const every = window.setInterval(() => { if (document.visibilityState === 'visible') void runSync(); }, EVERY_MS);
    void runSync();
    return () => {
      clearTimeout(timer);
      clearInterval(every);
      Dexie.on('storagemutated').unsubscribe(onMutated);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, []);
}
