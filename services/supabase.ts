import '@/utils/webCrypto'; // must run before the Supabase client is created
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Database } from './database.types';

/**
 * The one Supabase client. There is no app server: services/ call Supabase Auth, the Data API
 * (PostgREST), RPC functions and Storage directly. Only the publishable key ships in the app;
 * row level security in the database decides what each signed-in advocate can see (backend/supabase).
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('Supabase is not configured. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.');
}

// Web static rendering has no window; keep the session in memory there.
const isServer = typeof window === 'undefined';
const noStorage = { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined };

/** Where the session is persisted on the device (AsyncStorage key). */
export const AUTH_STORAGE_KEY = 'vakil.auth.v1';

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: isServer ? noStorage : AsyncStorage,
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    // PKCE: OAuth returns a one-time ?code= that is exchanged for the session (FR-AUTH-02).
    flowType: 'pkce',
    // On web the Google redirect lands back on the app URL and the client picks the code up itself.
    // /reset-password and /auth/callback exchange their codes themselves (once, in a known place).
    detectSessionInUrl:
      Platform.OS === 'web' ? (u, params) => u.pathname !== '/reset-password' && u.pathname !== '/auth/callback' && Boolean(params.code || params.access_token || params.error_description) : false,
  },
});

// Native apps only refresh tokens while in the foreground (Supabase guidance for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

/** The signed-in user's id. Storage paths start with it, matching the bucket policies. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
