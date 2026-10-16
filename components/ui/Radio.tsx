import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/haptics';
import { Text } from '@/components/ui/Text';

export type RadioProps = {
  selected: boolean;
  onPress?: () => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  decorative?: boolean;
};

/** CMP-20. 22 dp circle, 8 dp inner dot. */
export function Radio({ selected, onPress, label, description, disabled, decorative }: RadioProps) {
  const circle = (
    <View className={cn('h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px]', selected ? 'border-primary' : 'border-border-strong')}>
      {selected ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}
    </View>
  );
  if (decorative) return circle;

  return (
    <Pressable
      disabled={disabled}
      hitSlop={label ? 0 : 13}
      onPress={() => {
        haptic.light();
        onPress?.();
      }}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}
      className={label ? 'min-h-12 flex-row items-center gap-3' : undefined}
    >
      {circle}
      {label ? (
        <View className="flex-1">
          <Text variant="body">{label}</Text>
          {description ? (
            <Text variant="body-sm" tone="tertiary">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

type Option<T extends string> = { value: T; label: string; description?: string };

/** Vertical radio list (sort options, change status). */
export function RadioGroup<T extends string>({ value, options, onChange }: { value: T; options: Option<T>[]; onChange: (v: T) => void }) {
  return (
    <View accessibilityRole="radiogroup">
      {options.map((o) => (
        <Radio key={o.value} label={o.label} description={o.description} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}
