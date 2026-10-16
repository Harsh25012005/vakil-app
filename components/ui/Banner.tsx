import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconCloudOff, IconInfoCircle, IconX } from '@tabler/icons-react-native';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { fillBg, fillText } from '@/components/ui/tone';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';

type BannerTone = 'info' | 'success' | 'warning' | 'error' | 'offline';

const config = {
  info: { tone: 'info', icon: IconInfoCircle },
  success: { tone: 'success', icon: IconCircleCheck },
  warning: { tone: 'warning', icon: IconAlertTriangle },
  error: { tone: 'error', icon: IconAlertCircle },
  offline: { tone: 'info', icon: IconCloudOff },
} as const;

export type BannerProps = {
  tone?: BannerTone;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Omit for persistent banners (offline). */
  onDismiss?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** CMP-49. Full-width, rounded-lg, status subtle bg. Toast reuses this exact look. */
export function Banner({ tone = 'info', title, message, actionLabel, onAction, onDismiss, className, style }: BannerProps) {
  const c = config[tone];
  const fg = fillText[c.tone];
  return (
    <View accessibilityRole="alert" style={style} className={cn('flex-row items-start gap-3 rounded-lg p-3', fillBg[c.tone], className)}>
      <View className="pt-0.5">
        <Icon icon={c.icon} size={20} tone={fg} />
      </View>
      <View className="flex-1 gap-0.5">
        {title ? (
          <Text variant="body-sm" tone={fg} className="font-sans-bold">
            {title}
          </Text>
        ) : null}
        <Text variant="body-sm">{message}</Text>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" className="mt-1.5 self-start">
            <Text variant="body-sm" tone={fg} className="font-sans-bold">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss" className="pt-0.5">
          <Icon icon={IconX} size={18} tone="secondary" />
        </Pressable>
      ) : null}
    </View>
  );
}
