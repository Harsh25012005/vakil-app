import { IconBell, IconCalendarEvent, IconCheck, IconGavel, IconMapPin } from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { IconBadge } from '@/components/ui/IconBadge';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';

/**
 * Three product scenes for the welcome carousel, built from real design-system pieces.
 * Each sits on a soft tinted disc so the card never floats on an empty page.
 */
function Stage({ children }: { children: ReactNode }) {
  return (
    <View className="h-[260px] w-[300px] items-center justify-center">
      <View className="absolute h-[240px] w-[240px] rounded-full bg-primary-subtle" />
      <View className="w-[272px] gap-3">{children}</View>
    </View>
  );
}

const card = 'rounded-xl border border-border bg-surface p-4';

export function ReminderArt() {
  return (
    <Stage>
      <View className={`${card} gap-3`}>
        <View className="flex-row items-center justify-between">
          <Pill label="Hearing today" tone="warning" size="sm" />
          <Text variant="caption" tone="tertiary" tabular>
            10:30 AM
          </Text>
        </View>
        <Text variant="title">Shah v. Mehta</Text>
        <View className="flex-row items-center gap-2">
          <Icon icon={IconMapPin} size={16} tone="tertiary" />
          <Text variant="body-sm" tone="secondary">
            City Civil Court · Room 12
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3 self-end rounded-full border border-border bg-surface py-2 pl-2 pr-4">
        <IconBadge icon={IconBell} size="sm" />
        <Text variant="body-sm">Tomorrow, 8 PM</Text>
      </View>
    </Stage>
  );
}

export function QuickAddArt() {
  const field = 'h-11 justify-center rounded-full border border-border-strong bg-surface-2 px-4';
  return (
    <Stage>
      <View className={`${card} gap-3`}>
        <Text variant="overline" tone="tertiary">
          NEW CASE
        </Text>
        <View className={field}>
          <Text variant="body-sm">Shah v. Mehta</Text>
        </View>
        <View className={field}>
          <Text variant="body-sm" tone="secondary">
            Civil Suit · City Civil Court
          </Text>
        </View>
        <View className="h-11 items-center justify-center rounded-full bg-primary">
          <Text variant="body-sm" tone="on-primary" className="font-sans-semibold">
            Save case
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2 self-end rounded-full bg-success px-4 py-2">
        <Icon icon={IconCheck} size={16} tone="on-primary" />
        <Text variant="body-sm" tone="on-primary">
          Case saved
        </Text>
      </View>
    </Stage>
  );
}

export function OutcomeArt() {
  return (
    <Stage>
      <View className={`${card} gap-4`}>
        <View className="flex-row items-center gap-3">
          <IconBadge icon={IconGavel} />
          <View className="flex-1">
            <Text variant="title">Update outcome</Text>
            <Text variant="caption" tone="tertiary">
              Patel v. Patel
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Pill label="Adjourned" tone="adjourned" />
          <Pill label="Heard" tone="neutral" />
          <Pill label="Disposed" tone="neutral" />
        </View>
        <View className="flex-row items-center gap-2 rounded-full bg-primary-subtle px-4 py-3">
          <Icon icon={IconCalendarEvent} size={18} tone="primary" />
          <Text variant="body-sm" tone="primary">
            Next date: 30 Oct
          </Text>
        </View>
      </View>
    </Stage>
  );
}
