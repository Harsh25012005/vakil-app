import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { LinkText } from '@/components/ui/LinkText';
import { Text } from '@/components/ui/Text';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Drops the 32 dp section gap for the first section on a screen. */
  first?: boolean;
  className?: string;
};

/** CMP-29. Overline label (text-3) + optional action, 32 dp above. */
export function SectionHeader({ title, actionLabel, onAction, first, className }: Props) {
  return (
    <View className={cn('mb-3 flex-row items-center justify-between', !first && 'mt-8', className)}>
      <Text variant="overline" tone="tertiary" accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? <LinkText label={actionLabel} onPress={onAction} variant="chevron" /> : null}
    </View>
  );
}
