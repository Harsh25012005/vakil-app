import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cn } from '@/utils/cn';
import { elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { PressableScale } from '@/components/ui/PressableScale';

export type CardProps = {
  /** default = surface + border (level 1); subtle = tinted primary; flat = no border. */
  variant?: 'default' | 'subtle' | 'flat';
  padded?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  /**
   * The card holds its own buttons (call, Update, overflow). The card then stays tappable but is
   * not grouped as one a11y button, so screen readers can still reach the inner actions
   * (and web doesn't render <button> inside <button>).
   */
  containsActions?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

const variantClass = {
  default: 'bg-surface border border-border',
  subtle: 'bg-primary-subtle border border-primary/30',
  flat: 'bg-surface',
} as const;

/** The one card shell every domain card uses: rounded-lg (16), 16 padding, level-1 elevation. */
export function Card({ variant = 'default', padded = true, onPress, onLongPress, accessibilityLabel, containsActions, className, style, children }: CardProps) {
  const { scheme } = useTheme();
  const classes = cn('rounded-xl overflow-hidden', variantClass[variant], padded && 'p-4', className);
  // Light cards rely on their hairline border; a shadow on top reads as a thick, muddy stroke.
  const shadow = scheme === 'light' ? undefined : elevation(1, scheme);

  if (onPress || onLongPress) {
    return (
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        accessible={!containsActions}
        accessibilityRole={containsActions ? undefined : 'button'}
        accessibilityLabel={containsActions ? undefined : accessibilityLabel}
        className={classes}
        style={[shadow, style]}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View className={classes} style={[shadow, style]}>
      {children}
    </View>
  );
}
