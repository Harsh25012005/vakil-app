import { IconFingerprint, IconLock } from '@tabler/icons-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { IconBadge } from '@/components/ui/IconBadge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAppLock } from '@/hooks/useAppLock';
import { haptic } from '@/utils/haptics';

/** Full-screen cover shown while the app is locked. Uses the device biometric or screen lock. */
export function LockScreen() {
  const unlock = useAppLock((s) => s.unlock);
  const [failed, setFailed] = useState(false);

  const authenticate = useCallback(async () => {
    setFailed(false);
    try {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = has && (await LocalAuthentication.isEnrolledAsync());
      // A device with no screen lock cannot authenticate; never trap the user out of their own data.
      if (!enrolled) return unlock();
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Vakil', cancelLabel: 'Cancel' });
      if (r.success) {
        haptic.success();
        unlock();
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
  }, [unlock]);

  useEffect(() => {
    void authenticate();
  }, [authenticate]);

  return (
    <View className="absolute inset-0 z-50 items-center justify-center gap-6 bg-bg px-8" accessibilityViewIsModal>
      <IconBadge icon={IconLock} size="xl" />
      <View className="items-center gap-2">
        <Text variant="h2" accessibilityRole="header">
          Vakil is locked
        </Text>
        <Text variant="body" tone="secondary" className="text-center">
          {failed ? "That didn't work. Try again." : 'Confirm it is you to see your cases.'}
        </Text>
      </View>
      <View className="w-full">
        <Button label="Unlock" leadingIcon={IconFingerprint} onPress={authenticate} haptic="light" fullWidth />
      </View>
    </View>
  );
}
