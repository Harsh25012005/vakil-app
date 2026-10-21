import '../global.css';
import '@/utils/interop';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OfflineBanner } from '@/components/OfflineBanner';
import { LockScreen } from '@/components/LockScreen';
import { ToastProvider } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useAppLock, watchAppLock } from '@/hooks/useAppLock';
import { useReminders } from '@/hooks/useReminders';
import { useAutoCourtSync } from '@/hooks/useCases';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';

SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { scheme, colors, hydrateMode } = useTheme();
  const status = useAuth((s) => s.status);
  const advocate = useAuth((s) => s.advocate);

  // Apply the saved theme preference (FR-SET-02) once the profile is known.
  useEffect(() => {
    if (advocate?.theme) hydrateMode(advocate.theme);
  }, [advocate?.theme, hydrateMode]);

  const signedIn = status === 'signedIn';
  const onboarded = signedIn && !!advocate?.onboardedAt;
  const locked = useAppLock((s) => s.locked);
  useReminders(onboarded);
  // Cases update themselves from the court: once per app start, at most daily per case.
  useAutoCourtSync(onboarded);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {/* Route guards: the router picks the first screen whose guard passes (FR-AUTH-04). */}
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="case/[id]" />
          <Stack.Screen name="client/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="settings/[section]" />
          <Stack.Screen name="today" />
          <Stack.Screen name="archive" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="search" />
          <Stack.Screen name="design-system" />
          <Stack.Screen name="case/add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="case/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="client/add" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <OfflineBanner />
      {onboarded && locked ? <LockScreen /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const status = useAuth((s) => s.status);
  const setThemeMode = useAuth((s) => s.patch);

  // One cache for the app: lists stay fresh for 30 s, a failed read retries once (PRD: cached lists, bad signal).
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }));

  useEffect(() => {
    useAuth.getState().hydrate();
    void useAppLock.getState().hydrate();
    return watchAppLock();
  }, []);

  // Cached cases belong to the account that loaded them: drop them on sign-out so the next account starts clean.
  useEffect(() => {
    if (status === 'signedOut') queryClient.clear();
  }, [status, queryClient]);

  const ready = fontsLoaded && status !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  // Provider order: gestures -> safe area -> data -> theme (needed by everything visual) -> toasts.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark" onModeChange={(theme) => void setThemeMode({ theme })}>
            <ToastProvider>
              <AppStack />
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
