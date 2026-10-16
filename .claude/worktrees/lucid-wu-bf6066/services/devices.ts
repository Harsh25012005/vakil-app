import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { loadNotifications } from '@/utils/permissions';
import { currentUserId, supabase } from './supabase';

/**
 * Server-sent reminders (FR-NOTIF-01): this device's Expo push token is stored in device_tokens, and the
 * send-reminders Edge Function (backend/supabase/functions) pushes the evening / morning digests to it.
 *
 * Nothing here asks for permission (onboarding and Settings do that). Registration is best-effort and
 * silently skipped when notifications are not allowed, in Expo Go on Android, on web (the Expo push service
 * only delivers to iOS and Android), or before `eas init` has added an EAS project id to app.json.
 */

/** Android channel the pushes are sent to. Must match ANDROID_CHANNEL_ID in the Edge Function. */
const CHANNEL_ID = 'reminders';
/** The token registered for the signed-in user, so logout can remove it without asking Expo again. */
const TOKEN_KEY = 'vakil.pushToken.v1';

// One registration per user per app launch: it also bumps last_seen_at.
let registeredFor: string | null = null;
let inflight: Promise<void> | null = null;

async function register() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const Notifications = loadNotifications();
  const userId = await currentUserId();
  if (!Notifications || !userId || registeredFor === userId) return;
  try {
    if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
    const projectId = Constants.easConfig?.projectId ?? (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
    if (!projectId) return;

    // A reminder that arrives while the app is open still shows as a banner.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    // Android only shows pushes sent to a channel that exists, so create it before handing out the token.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: 'Hearing reminders', importance: Notifications.AndroidImportance.HIGH });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase
      .from('device_tokens')
      .upsert({ advocate_id: userId, expo_push_token: token, platform: Platform.OS, last_seen_at: new Date().toISOString() }, { onConflict: 'advocate_id,expo_push_token' });
    if (error) return;
    registeredFor = userId;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // No push token (simulator, Expo Go, offline): reminders stay in the in-app notification centre.
  }
}

/** Saves this device's push token for the signed-in advocate. Safe to call often. */
export function registerDevice(): Promise<void> {
  inflight ??= register().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * Stops reminders for the signed-in advocate on this device. Call before signing out (deleting the row
 * needs the session). Gives up after a few seconds so sign-out never hangs on a bad connection.
 */
export async function unregisterDevice(): Promise<void> {
  registeredFor = null;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await AsyncStorage.removeItem(TOKEN_KEY);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 5000);
  try {
    await supabase.from('device_tokens').delete().eq('expo_push_token', token).abortSignal(abort.signal);
  } catch {
    // Offline: the row stays until the token is registered by another account or Expo reports it dead.
  } finally {
    clearTimeout(timer);
  }
}
