import { create } from 'zustand';
import * as auth from '@/services/auth';
import { supabase } from '@/services/supabase';
import type { Advocate } from '@/services/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: Status;
  advocate: Advocate | null;
  /** Reads the persisted Supabase session once at launch (FR-AUTH-03). */
  hydrate: () => Promise<void>;
  setSession: (s: auth.Session) => void;
  patch: (p: Partial<Advocate>) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  advocate: null,
  hydrate: async () => {
    try {
      const s = await auth.loadSession();
      set(s ? { status: 'signedIn', advocate: s.advocate } : { status: 'signedOut', advocate: null });
    } catch {
      // Offline on first launch with no cached profile: show sign-in rather than a stuck splash.
      set({ status: 'signedOut', advocate: null });
    }
  },
  setSession: (s) => set({ status: 'signedIn', advocate: s.advocate }),
  patch: async (p) => {
    const prev = get().advocate;
    if (!prev) return; // e.g. the theme toggle on a signed-out screen: nothing to save
    set({ advocate: { ...prev, ...p } }); // optimistic
    try {
      const s = await auth.updateProfile(p);
      set({ advocate: s.advocate });
    } catch (e) {
      set({ advocate: prev });
      throw e;
    }
  },
  signOut: async () => {
    await auth.logout();
    set({ status: 'signedOut', advocate: null });
  },
  deleteAccount: async () => {
    await auth.deleteAccount();
    set({ status: 'signedOut', advocate: null });
  },
}));

/**
 * Supabase can end the session on its own (refresh token revoked or expired, signed out elsewhere).
 * Sign-ins are applied explicitly by the screens, so only sign-outs are handled here.
 */
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && useAuth.getState().status === 'signedIn') {
    useAuth.setState({ status: 'signedOut', advocate: null });
  }
});

export const useAdvocate = () => useAuth((s) => s.advocate);
