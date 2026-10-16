import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { errorMessage } from '@/services/api';
import { completeAuthRedirect, GOOGLE_POPUP_NAME } from '@/services/auth';

/**
 * Landing route for the Google sign-in redirect (vakil://auth/callback?code=...). The in-app browser
 * session normally captures the redirect itself; on Android the deep link can also open this route,
 * so it finishes the sign-in (once per code) and moves on. The route guards then pick the next screen.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<Record<string, string>>();
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const setSession = useAuth((s) => s.setSession);

  useEffect(() => {
    completeAuthRedirect(Linking.createURL('auth/callback', { queryParams: params }))
      .then(setSession)
      .catch((e) => {
        if (useAuth.getState().status !== 'signedIn') toast.show({ type: 'error', message: errorMessage(e) });
      })
      .finally(() => {
        // Opened as the Google popup: the opener picks the session up itself, so just close.
        if (Platform.OS === 'web' && (params.popup === '1' || window.name === GOOGLE_POPUP_NAME)) window.close();
        else router.replace('/');
      });
    // Runs once for the URL that opened this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
