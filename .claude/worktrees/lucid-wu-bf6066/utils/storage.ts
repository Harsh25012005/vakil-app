import AsyncStorage from '@react-native-async-storage/async-storage';

/** Tiny typed wrapper for small device-local preferences (FR-CASE-10 sort choice, welcome seen, recents...). */
export async function getStored<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(`vakil.${key}`);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function setStored<T>(key: string, value: T) {
  try {
    await AsyncStorage.setItem(`vakil.${key}`, JSON.stringify(value));
  } catch {
    /* non-critical */
  }
}
