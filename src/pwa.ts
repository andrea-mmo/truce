/**
 * App updates. When a new version has been published, the app shows an
 * "Actualizar" button instead of reloading by surprise. It also checks on
 * start, when you come back to the app and every hour, or on demand.
 */
import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

declare const __APP_VERSION__: string;
export const APP_VERSION = __APP_VERSION__;

type State = { needRefresh: boolean; checking: boolean; lastCheck: number | null };
let state: State = { needRefresh: false, checking: false, lastCheck: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

let registration: ServiceWorkerRegistration | undefined;

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { set({ needRefresh: true }); },
  onRegisteredSW(_url, reg) {
    registration = reg;
    if (!reg) return;
    setInterval(() => { void checkForUpdate(); }, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    });
  },
});

/** Asks the server for a newer version. Resolves to true if one is ready. */
export async function checkForUpdate(): Promise<boolean> {
  if (!registration) return state.needRefresh;
  set({ checking: true });
  try { await registration.update(); } catch { /* offline: try later */ }
  // A found update installs in the background and then fires onNeedRefresh.
  await new Promise((r) => setTimeout(r, 1500));
  set({ checking: false, lastCheck: Date.now() });
  return state.needRefresh;
}

/** Switches to the new version (the page reloads). */
export function applyUpdate() {
  void updateSW(true);
}

export function useUpdateState(): State {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
