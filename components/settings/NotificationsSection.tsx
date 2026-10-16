import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Banner } from '@/components/ui/Banner';
import { Card } from '@/components/ui/Card';
import { TimePicker } from '@/components/ui/TimePicker';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/services/api';
import { notificationStatus, requestNotifications } from '@/utils/permissions';
import type { NotificationPrefs } from '@/services/types';

/** SCR-45 Notification settings. Each reminder has a switch and, when on, a time. */
export function NotificationsSection() {
  const toast = useToast();
  const prefs = useAuth((s) => s.advocate?.notificationPrefs);
  const patch = useAuth((s) => s.patch);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    notificationStatus().then((s) => setDenied(s === 'denied'));
  }, []);

  if (!prefs) return null;

  const change = async (p: Partial<NotificationPrefs>) => {
    try {
      await patch({ notificationPrefs: { ...prefs, ...p } });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const allow = async () => {
    const s = await requestNotifications();
    setDenied(s === 'denied');
  };

  return (
    <View className="gap-5">
      {denied ? <Banner tone="warning" title="Notifications are off" message="Reminders can't reach you until you allow them in your phone settings." actionLabel="Allow" onAction={allow} /> : null}

      <Card className="gap-4">
        <Toggle label="Evening before" description="A digest of tomorrow's hearings." value={prefs.eveningEnabled} onValueChange={(v) => change({ eveningEnabled: v })} />
        {prefs.eveningEnabled ? <TimePicker label="Send at" value={prefs.eveningTime} onChange={(t) => change({ eveningTime: t })} /> : null}
      </Card>

      <Card className="gap-4">
        <Toggle label="Morning of" description="Which courts you are in today." value={prefs.morningEnabled} onValueChange={(v) => change({ morningEnabled: v })} />
        {prefs.morningEnabled ? <TimePicker label="Send at" value={prefs.morningTime} onChange={(t) => change({ morningTime: t })} /> : null}
      </Card>

      <Card>
        <Toggle label="Needs-update nudge" description="If a hearing has no outcome recorded by evening." value={prefs.needsUpdateEnabled} onValueChange={(v) => change({ needsUpdateEnabled: v })} />
      </Card>
    </View>
  );
}
