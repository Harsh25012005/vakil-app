import { ActivityIndicator, View } from 'react-native';
import { cn } from '@/utils/cn';
import { type Tone } from '@/constants/theme';
import { type HapticKind } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';
import { GradientSurface } from '@/components/ui/GradientSurface';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text, type TextVariant } from '@/components/ui/Text';

export type ButtonVariant =
  /** Main action on a screen. One per view. Filled with the brand gradient. */
  | 'primary'
  /** Brand-tinted secondary action. */
  | 'secondary'
  /** Neutral filled, for low-emphasis actions next to a primary. */
  | 'tonal'
  | 'outline'
  | 'ghost'
  /** Text-only, no padding; sits inline with content. */
  | 'link'
  | 'success'
  | 'destructive'
  /** Tinted red: destructive but not final (Remove, Archive). */
  | 'destructive-soft'
  | 'destructive-ghost';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'tonal',
  'outline',
  'ghost',
  'link',
  'success',
  'destructive',
  'destructive-soft',
  'destructive-ghost',
];
export const BUTTON_SIZES: ButtonSize[] = ['xs', 'sm', 'md', 'lg'];

/** [rest, pressed] container classes. Literal strings: NativeWind compiles at build time. */
const containerClass: Record<ButtonVariant, [string, string]> = {
  primary: ['', ''],
  secondary: ['bg-primary-subtle', 'bg-primary/25'],
  tonal: ['bg-surface-2', 'bg-border'],
  outline: ['border-[1.5px] border-border-strong', 'border border-border-strong bg-surface-2'],
  ghost: ['', 'bg-surface-2'],
  link: ['', ''],
  success: ['bg-success-solid', 'bg-success-solid-pressed'],
  destructive: ['bg-error-solid', 'bg-error-solid-pressed'],
  'destructive-soft': ['bg-error-bg', 'bg-error/25'],
  'destructive-ghost': ['', 'bg-error-bg'],
};

const labelTone: Record<ButtonVariant, Tone> = {
  primary: 'on-primary',
  secondary: 'primary',
  tonal: 'default',
  outline: 'default',
  ghost: 'primary',
  link: 'primary',
  success: 'on-primary',
  destructive: 'on-primary',
  'destructive-soft': 'error',
  'destructive-ghost': 'error',
};

/** Pill: horizontal padding grows with height so the ends stay proportionate. */
const sizeSpec: Record<ButtonSize, { box: string; gap: string; icon: number; text: TextVariant }> = {
  xs: { box: 'h-8 px-3', gap: 'gap-1', icon: 14, text: 'body-sm' },
  sm: { box: 'h-9 px-4', gap: 'gap-1.5', icon: 16, text: 'button' },
  md: { box: 'h-11 px-5', gap: 'gap-2', icon: 18, text: 'button' },
  lg: { box: 'h-[52px] px-6', gap: 'gap-2', icon: 20, text: 'button' },
};

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  haptic?: HapticKind;
  accessibilityLabel?: string;
  className?: string;
};

/**
 * CMP-01. Pill shape (rounded-full) at every size. Loading swaps the label for a spinner with
 * the width locked so the layout never jumps. Disabled = 40% opacity, no press.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  leadingIcon,
  trailingIcon,
  fullWidth,
  loading,
  disabled,
  haptic,
  accessibilityLabel,
  className,
}: ButtonProps) {
  const { toneColor } = useTheme();
  const tone = labelTone[variant];
  const spec = sizeSpec[size];
  const isLink = variant === 'link';

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      scaleTo={isLink ? 1 : undefined}
      hitSlop={isLink ? 12 : undefined}
      accessibilityRole={isLink ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      className={cn('overflow-hidden rounded-full', fullWidth ? 'self-stretch' : 'self-start', className)}
    >
      {({ pressed }) => (
        <View
          className={cn(
            'flex-row items-center justify-center overflow-hidden rounded-full',
            isLink ? 'h-auto px-0' : spec.box,
            containerClass[variant][pressed ? 1 : 0],
          )}
        >
          {variant === 'primary' ? (
            <GradientSurface variant="primary" className="absolute inset-0">
              {pressed ? <View className="absolute inset-0 bg-black/15" /> : null}
            </GradientSurface>
          ) : null}
          <View className={cn('flex-row items-center', spec.gap, loading && 'opacity-0')}>
            {leadingIcon ? <Icon icon={leadingIcon} size={spec.icon} tone={tone} /> : null}
            <Text
              variant={spec.text}
              tone={tone}
              numberOfLines={1}
              className={cn(size === 'xs' && 'font-sans-semibold', isLink && pressed && 'underline')}
            >
              {label}
            </Text>
            {trailingIcon ? <Icon icon={trailingIcon} size={spec.icon} tone={tone} /> : null}
          </View>
          {loading ? <ActivityIndicator className="absolute" size="small" color={toneColor(tone)} /> : null}
        </View>
      )}
    </PressableScale>
  );
}
