import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { IconComponent } from '@/components/ui/Icon';
import { IconBadge } from '@/components/ui/IconBadge';
import { LinkText } from '@/components/ui/LinkText';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';
import { elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type EmptyStateProps = {
  icon: IconComponent;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
};

/** CMP-50. 32 icon in a 72 circle with glow, title, one line, primary CTA. Max width 280. */
export function EmptyState({ icon, title, message, actionLabel, onAction, secondaryLabel, onSecondary, className }: EmptyStateProps) {
  const { scheme } = useTheme();
  return (
    <View className={cn('w-full max-w-[280px] items-center self-center py-10', className)}>
      <View className="rounded-full" style={elevation(3, scheme)}>
        <IconBadge icon={icon} tone="primary" size="xl" />
      </View>
      <Text variant="h3" className="mt-5 text-center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="secondary" className="mt-2 text-center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} size="md" className="mt-6 self-center" /> : null}
      {secondaryLabel && onSecondary ? <LinkText label={secondaryLabel} onPress={onSecondary} className="mt-4 self-center" /> : null}
    </View>
  );
}
