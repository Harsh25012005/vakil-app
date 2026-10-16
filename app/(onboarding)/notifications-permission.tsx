import { IconBell, IconCalendarEvent, IconGavel } from '@tabler/icons-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { FormScreen } from '@/components/FormScreen';
import { Button } from '@/components/ui/Button';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';
import { requestNotifications } from '@/utils/permissions';
import { useRouter } from 'expo-router';

// SCR-08 Notification permission
const POINTS: { icon: IconComponent; title: string; body: string }[] = [
  { icon: IconCalendarEvent, title: 'Evening before, 8 PM', body: 'A digest of tomorrow\'s hearings, so you can prepare.' },
  { icon: IconBell, title: 'Morning of, 8 AM', body: 'Which courts you are in today, in order.' },
  { icon: IconGavel, title: 'Evening nudge, 6 PM', body: "If a hearing has no outcome yet, so your diary stays correct." },
];

export default function NotificationPermission() {
  const router = useRouter();
  const toast = useToast();
  const patch = useAuth((s) => s.patch);
  const [busy, setBusy] = useState<'allow' | 'later' | null>(null);

  // Allow and Later both finish onboarding; denial never blocks the app (FR-ONB-03, Flow 1).
  const finish = async (allow: boolean) => {
    setBusy(allow ? 'allow' : 'later');
    try {
      if (allow) await requestNotifications();
      await patch({ onboardedAt: new Date().toISOString() });
      router.replace('/');
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
      setBusy(null);
    }
  };

  return (
    <FormScreen avoidKeyboard={false}
      onBack={() => router.back()}
      eyebrow="Step 2 of 2"
      title="Never miss a date"
      subtitle="Reminders are the heart of Vakil. Allow notifications to get them."
      footer={
        <>
          <Button label="Allow reminders" loading={busy === 'allow'} disabled={busy === 'later'} onPress={() => finish(true)} fullWidth haptic="light" />
          <Button label="Maybe later" variant="ghost" loading={busy === 'later'} disabled={busy === 'allow'} onPress={() => finish(false)} fullWidth />
        </>
      }
    >
      <View className="gap-4">
        {POINTS.map((p) => (
          <View key={p.title} className="flex-row items-center gap-4 rounded-xl border border-border bg-surface p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-subtle">
              <Icon icon={p.icon} size={24} tone="primary" />
            </View>
            <View className="flex-1">
              <Text variant="title">{p.title}</Text>
              <Text variant="body-sm" tone="secondary">
                {p.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </FormScreen>
  );
}
