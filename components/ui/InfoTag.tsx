import { View } from 'react-native';
import { cn } from '@/utils/cn';
import type { Tone } from '@/constants/theme';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

type Props = {
  icon: IconComponent;
  label: string;
  tone?: Tone;
  tabular?: boolean;
  /** White at 80% for text on gradients (hero card). */
  inverse?: boolean;
  className?: string;
};

/** CMP-36. Icon 16 + body-sm meta (court, judge, date). */
export function InfoTag({ icon, label, tone = 'secondary', tabular, inverse, className }: Props) {
  return (
    <View className={cn('flex-row items-center gap-1.5', inverse && 'opacity-90', className)}>
      <Icon icon={icon} size={16} tone={inverse ? 'on-primary' : tone} />
      <Text variant="body-sm" tone={inverse ? 'on-primary' : tone} tabular={tabular} numberOfLines={1} className="flex-shrink">
        {label}
      </Text>
    </View>
  );
}
