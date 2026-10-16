import { AppState } from 'react-native';
import { create } from 'zustand';
import { getStored, setStored } from '@/utils/storage';

const KEY = 'app-lock';
/** FR-SEC: re-lock after the app has been in the background this long. */
export const RELOCK_AFTER_MS = 30_000;

type LockState = {
  enabled: boolean;
  locked: boolean;
  ready: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (v: boolean) => void;
  unlock: () => void;
  lock: () => void;
};

export const useAppLock = create<LockState>((set, get) => ({
  enabled: false,
  locked: false,
  ready: false,
  hydrate: async () => {
    const enabled = await getStored<boolean>(KEY, false);
    set({ enabled, locked: enabled, ready: true });
  },
  setEnabled: (enabled) => {
    set({ enabled, locked: false });
    void setStored(KEY, enabled);
  },
  unlock: () => set({ locked: false }),
  lock: () => get().enabled && set({ locked: true }),
}));

/** Locks when the app returns from a long stay in the background. Call once at the root. */
export function watchAppLock() {
  let leftAt = 0;
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'background' || s === 'inactive') leftAt ||= Date.now();
    else if (s === 'active') {
      if (leftAt && Date.now() - leftAt > RELOCK_AFTER_MS) useAppLock.getState().lock();
      leftAt = 0;
    }
  });
  return () => sub.remove();
}
