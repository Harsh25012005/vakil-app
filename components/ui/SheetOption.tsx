import { IconCheck } from '@tabler/icons-react-native';
import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Radio } from '@/components/ui/Radio';
import { Text } from '@/components/ui/Text';

export type SheetOptionProps = {
  label: string;
  description?: string;
  icon?: IconComponent;
  selected?: boolean;
  /** check = single select, checkbox = multi select, radio = sort / status lists. */
  control?: 'check' | 'checkbox' | 'radio' | 'none';
  destructive?: boolean;
  onPress: () => void;
};

/** The row used in every sheet list (Select, MultiSelect, ActionSheet, sort, status). 52 dp min. */
export function SheetOption({ label, description, icon, selected, control = 'check', destructive, onPress }: SheetOptionProps) {
  const role = control === 'checkbox' ? 'checkbox' : control === 'radio' ? 'radio' : 'button';
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      haptic="selection"
      accessibilityRole={role}
      accessibilityState={{ selected: !!selected, checked: control === 'checkbox' || control === 'radio' ? !!selected : undefined }}
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <View className={cn('min-h-[52px] flex-row items-center gap-3 px-5 py-2', pressed && 'bg-border/40')}>
          {control === 'checkbox' ? <Checkbox checked={!!selected} decorative /> : null}
          {control === 'radio' ? <Radio selected={!!selected} decorative /> : null}
          {icon ? <Icon icon={icon} size={20} tone={destructive ? 'error' : 'secondary'} /> : null}
          <View className="flex-1">
            <Text variant="body" tone={destructive ? 'error' : 'default'} className={cn(selected && control === 'check' && 'font-sans-semibold')}>
              {label}
            </Text>
            {description ? (
              <Text variant="body-sm" tone="tertiary">
                {description}
              </Text>
            ) : null}
          </View>
          {control === 'check' && selected ? <Icon icon={IconCheck} size={20} tone="brand" strokeWidth={2.25} /> : null}
        </View>
      )}
    </PressableScale>
  );
}
