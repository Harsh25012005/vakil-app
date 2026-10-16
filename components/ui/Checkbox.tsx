import { IconCheck, IconMinus } from '@tabler/icons-react-native';
import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/haptics';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

export type CheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  /** Render the box only; the parent row owns the press + a11y (sheet rows). */
  decorative?: boolean;
};

/** CMP-19. 22 dp, 7 dp radius, primary fill + white check. */
export function Checkbox({ checked, indeterminate, onChange, label, disabled, decorative }: CheckboxProps) {
  const on = checked || indeterminate;
  const box = (
    <View
      className={cn(
        'h-[22px] w-[22px] items-center justify-center rounded-[7px] border-[1.5px]',
        on ? 'border-primary bg-primary' : 'border-border-strong bg-transparent',
      )}
    >
      {on ? <Icon icon={indeterminate ? IconMinus : IconCheck} size={16} tone="on-primary" strokeWidth={2.75} /> : null}
    </View>
  );

  if (decorative) return box;

  return (
    <Pressable
      disabled={disabled}
      hitSlop={label ? 0 : 13}
      onPress={() => {
        haptic.light();
        onChange?.(!checked);
      }}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: indeterminate ? 'mixed' : checked, disabled: !!disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}
      className={label ? 'min-h-12 flex-row items-center gap-3' : undefined}
    >
      {box}
      {label ? (
        <Text variant="body" className="flex-1">
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
