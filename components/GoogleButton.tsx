import { GoogleIcon } from '@/components/GoogleIcon';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';
import { signInWithGoogle } from '@/services/auth';

/** "or" divider plus the Google button, shared by Sign in and Sign up. */
export function GoogleButton() {
  const toast = useToast();
  const setSession = useAuth((s) => s.setSession);
  const [loading, setLoading] = useState(false);

  // Same button for sign-in and sign-up: Supabase creates the account on the first Google sign-in.
  const go = async () => {
    setLoading(true);
    try {
      const session = await signInWithGoogle();
      if (session) setSession(session);
      else setLoading(false); // cancelled, or popups blocked and the page is redirecting
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
      setLoading(false);
    }
  };

  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-border" />
        <Text variant="body-sm" tone="tertiary">
          or
        </Text>
        <View className="h-px flex-1 bg-border" />
      </View>
      <Button label="Continue with Google" variant="tonal" leadingIcon={GoogleIcon} loading={loading} onPress={go} fullWidth />
    </View>
  );
}
