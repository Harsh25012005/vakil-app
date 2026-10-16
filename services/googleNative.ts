import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type GoogleSigninLib = typeof import('@react-native-google-signin/google-signin');

let lib: GoogleSigninLib | null | undefined;

/**
 * The native Google account picker (Android bottom-sheet dialog / iOS sheet), or null when it can't
 * be used: on web, inside Expo Go (no native module there), or before EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 * is set. Callers fall back to the browser OAuth flow when this returns null.
 */
export function nativeGoogle(): GoogleSigninLib | null {
  if (lib !== undefined) return lib;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !webClientId) return (lib = null);
  try {
    // Loaded lazily: importing it where the native module is missing throws.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const g = require('@react-native-google-signin/google-signin') as GoogleSigninLib;
    // The ID token's audience must be the Web client ID registered on the Supabase Google provider.
    g.GoogleSignin.configure({ webClientId, iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined });
    lib = g;
  } catch {
    lib = null;
  }
  return lib;
}
