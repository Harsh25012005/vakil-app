import * as LocalAuthentication from 'expo-local-authentication';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { useAppLock } from '@/hooks/useAppLock';

/** SCR-47 Security: optional app lock, confirmed once before it is switched on. */
export function SecuritySection() {
  const toast = useToast();
  const enabled = useAppLock((s) => s.enabled);
  const setEnabled = useAppLock((s) => s.setEnabled);

  const change = async (on: boolean) => {
    if (!on) return setEnabled(false);
    try {
      const enrolled = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      if (!enrolled) return toast.show({ type: 'info', message: 'Set up a fingerprint, face or screen lock on your phone first.' });
      const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to turn on app lock' });
      if (r.success) setEnabled(true);
    } catch {
      toast.show({ type: 'error', message: "Couldn't turn on app lock." });
    }
  };

  return (
    <View className="gap-3">
      <Card>
        <Toggle label="App lock" description="Ask for your fingerprint, face or screen lock when you open Vakil." value={enabled} onValueChange={change} />
      </Card>
      <Text variant="caption" tone="tertiary" className="px-1">
        Vakil also locks after 30 seconds in the background.
      </Text>
    </View>
  );
}
