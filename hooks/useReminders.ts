import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { rescheduleReminders } from '@/services/reminders';
import { loadNotifications } from '@/utils/permissions';
import { useAuth } from './useAuth';

/** Rebuilds the phone's reminder schedule from the latest data. Call after anything that changes dates. */
export const refreshReminders = () => {
  const { status, advocate } = useAuth.getState();
  if (status === 'signedIn' && advocate?.onboardedAt) void rescheduleReminders(advocate.notificationPrefs);
};

/**
 * Keeps reminders scheduled while a signed-in, onboarded advocate uses the app, and opens the right
 * screen when a reminder is tapped (including one that launched the app).
 */
export function useReminders(active: boolean) {
  const prefs = useAuth((s) => s.advocate?.notificationPrefs);

  // Reschedule on sign-in, when the reminder settings change, and each time the app comes to the front.
  useEffect(() => {
    if (!active) return;
    refreshReminders();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshReminders());
    return () => sub.remove();
  }, [active, prefs]);

  useEffect(() => {
    const N = loadNotifications();
    if (!active || !N || Platform.OS === 'web') return;
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    const open = (r: { notification: { request: { content: { data?: Record<string, unknown> | null } } } }) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as Href);
    };
    void N.getLastNotificationResponseAsync()
      .then((r) => r && open(r))
      .catch(() => undefined);
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [active]);
}
