import { IconChevronRight } from '@tabler/icons-react-native';
import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

type Props = {
  label: string;
  onPress: () => void;
  /** default = standalone, inline = inside a paragraph, chevron = "See all >". */
  variant?: 'default' | 'inline' | 'chevron';
  className?: string;
};

/** CMP-04. Primary text, underline on press. */
export function LinkText({ label, onPress, variant = 'default', className }: Props) {
  if (variant === 'inline') {
    return (
      <Text
        variant="body"
        tone="primary"
        accessibilityRole="link"
        suppressHighlighting
        onPress={onPress}
        className={cn('font-sans-semibold', className)}
      >
        {label}
      </Text>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      hitSlop={12}
      accessibilityRole="link"
      accessibilityLabel={label}
      className={cn('self-start', className)}
    >
      {({ pressed }) => (
        <View className="flex-row items-center gap-0.5">
          <Text variant="button" tone="primary" className={cn(pressed && 'underline')}>
            {label}
          </Text>
          {variant === 'chevron' ? <Icon icon={IconChevronRight} size={16} tone="primary" /> : null}
        </View>
      )}
    </PressableScale>
  );
}
