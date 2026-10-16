import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { sizes, type Tone } from '@/constants/theme';
import { type HapticKind } from '@/utils/haptics';
import { Badge } from '@/components/ui/Badge';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';

export type IconButtonVariant = 'filled' | 'secondary' | 'tonal' | 'outline' | 'ghost' | 'destructive';
type Variant = IconButtonVariant;
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, [string, string]> = {
  filled: ['bg-primary', 'bg-primary-pressed'],
  secondary: ['bg-primary-subtle', 'bg-primary/25'],
  tonal: ['bg-surface-2', 'bg-border'],
  ghost: ['', 'bg-surface-2'],
  outline: ['border-[1.5px] border-border-strong', 'border border-border-strong bg-surface-2'],
  destructive: ['bg-error-bg', 'bg-error/25'],
};

const sizeMap: Record<Size, { box: string; px: number; icon: number }> = {
  sm: { box: 'h-8 w-8', px: 32, icon: 20 },
  md: { box: 'h-10 w-10', px: 40, icon: 20 },
  lg: { box: 'h-12 w-12', px: 48, icon: 24 },
};

export type IconButtonProps = {
  icon: IconComponent;
  /** Required: every icon button needs a screen-reader label (FRS 9.4). */
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  shape?: 'rounded' | 'circle';
  /** Overrides the icon tone, e.g. success for WhatsApp. */
  tone?: Tone;
  badge?: number | 'dot';
  disabled?: boolean;
  haptic?: HapticKind;
  className?: string;
};

/** CMP-02. Circle by default (rounded-xl square optional). Visual 32 / 40 / 48, touch target always 48. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'ghost',
  size = 'md',
  shape = 'circle',
  tone,
  badge,
  disabled,
  haptic,
  className,
}: IconButtonProps) {
  const s = sizeMap[size];
  const slop = Math.max(0, (sizes.touchTarget - s.px) / 2);
  const iconTone: Tone =
    tone ?? (variant === 'filled' ? 'on-primary' : variant === 'secondary' ? 'primary' : variant === 'destructive' ? 'error' : 'default');

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      hitSlop={slop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={className}
    >
      {({ pressed }) => (
        <View
          className={cn(
            'items-center justify-center',
            s.box,
            shape === 'circle' ? 'rounded-full' : 'rounded-xl',
            variantClass[variant][pressed ? 1 : 0],
          )}
        >
          <Icon icon={icon} size={s.icon} tone={iconTone} />
          {badge !== undefined ? (
            <View className="absolute -right-1 -top-1">
              {badge === 'dot' ? <Badge variant="dot" /> : <Badge variant="count" count={badge} />}
            </View>
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}
