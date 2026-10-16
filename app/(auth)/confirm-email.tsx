import { IconMailCheck } from '@tabler/icons-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { IconBadge } from '@/components/ui/IconBadge';
import { LinkText } from '@/components/ui/LinkText';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/services/api';
import { resendConfirmation } from '@/services/auth';
import { openGmail } from '@/utils/contact';

// SCR-04b Confirm your email: shown after sign-up while Supabase waits for the confirmation link.
const RESEND_SECONDS = 60;

export default function ConfirmEmail() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const toast = useToast();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const gmail = async () => {
    if (!(await openGmail())) toast.show({ type: 'error', message: "Couldn't open Gmail. Open your email app and look for the message from Vakil." });
  };

  const resend = async () => {
    setSending(true);
    try {
      await resendConfirmation(email);
      setSeconds(RESEND_SECONDS);
      toast.show({ type: 'success', message: 'A new confirmation email is on its way.' });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <FormScreen
      avoidKeyboard={false}
      onBack={() => router.replace('/sign-in')}
      title="Check your email"
      subtitle="One last step to activate your account."
      footer={
        <>
          <Button label="Open Gmail" onPress={gmail} fullWidth haptic="light" />
          <Button label="I've confirmed, sign in" variant="ghost" onPress={() => router.replace('/sign-in')} fullWidth />
        </>
      }
    >
      <View className="items-center gap-4 rounded-xl border border-border bg-surface p-6">
        <IconBadge icon={IconMailCheck} size="xl" />
        <View className="items-center gap-1">
          <Text variant="body" tone="secondary" className="text-center">
            We sent a confirmation link to
          </Text>
          <Text variant="title" className="text-center">
            {email}
          </Text>
        </View>
        <Text variant="body-sm" tone="secondary" className="text-center">
          Tap the link in that email to confirm your address, then come back and sign in. Can&apos;t find it? Check Spam or Promotions.
        </Text>
      </View>

      <View className="flex-row items-center justify-center gap-1">
        {seconds > 0 ? (
          <Text variant="body-sm" tone="secondary" tabular>{`Resend email in ${seconds}s`}</Text>
        ) : (
          <LinkText label={sending ? 'Sending…' : 'Resend email'} onPress={() => !sending && void resend()} />
        )}
      </View>
    </FormScreen>
  );
}
