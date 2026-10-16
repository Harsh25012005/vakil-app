/**
 * expo-notifications loads a native module that Expo Go does not ship, and importing it at the top of a
 * screen crashes that route. Load it lazily and treat any failure as "unavailable".
 */
type Status = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export const loadNotifications = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
};

export async function notificationStatus(): Promise<Status> {
  try {
    return (await loadNotifications()?.getPermissionsAsync())?.status ?? 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function requestNotifications(): Promise<Status> {
  try {
    return (await loadNotifications()?.requestPermissionsAsync())?.status ?? 'unavailable';
  } catch {
    return 'unavailable';
  }
}
