import { IconCheck, IconX } from '@tabler/icons-react-native';
import { Pressable, View } from 'react-native';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconComponent;
  count?: number;
  disabled?: boolean;
};

/** Shared chrome: 32 dp, rounded-full; selected = primary-subtle bg + primary border. */
function SelectableChip({ label, selected, onPress, icon, count, disabled, showCheck, role }: SelectableChipProps & { showCheck: boolean; role: 'checkbox' | 'radio' }) {
  const leading = selected && showCheck ? IconCheck : icon;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      className={cn(
        'h-8 flex-row items-center gap-1.5 self-start rounded-full border px-3',
        selected ? 'border-primary bg-primary-subtle' : 'border-border bg-surface',
        leading && 'pl-2.5',
      )}
    >
      {leading ? <Icon icon={leading} size={16} tone={selected ? 'primary' : 'secondary'} strokeWidth={selected && showCheck ? 2.25 : undefined} /> : null}
      <Text variant="body-sm" tone={selected ? 'primary' : 'default'}>
        {label}
      </Text>
      {count !== undefined ? (
        <View className={cn('h-[18px] min-w-[18px] items-center justify-center rounded-full px-1', selected ? 'bg-primary' : 'bg-surface-2')}>
          <Text variant="caption" tone={selected ? 'on-primary' : 'secondary'} tabular>
            {count > 99 ? '99+' : String(count)}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

/** CMP-22. Multi-select filter, check icon when selected, optional count. */
export function FilterChip(props: SelectableChipProps) {
  return <SelectableChip {...props} showCheck role="checkbox" />;
}

/** CMP-23. Single-select row (case types, quick dates). Same look as filter chip. */
export function ChoiceChip(props: SelectableChipProps) {
  return <SelectableChip {...props} showCheck={false} role="radio" />;
}

export type InputChipProps = {
  label: string;
  onRemove?: () => void;
  avatar?: { name: string; uri?: string };
};

/** CMP-24. 28 dp, removable, optional avatar. Lives inside fields (MultiSelect, client pickers). */
export function InputChip({ label, onRemove, avatar }: InputChipProps) {
  return (
    <View className={cn('h-8 flex-row items-center gap-1.5 self-start rounded-full border border-border bg-surface', avatar ? 'pl-1' : 'pl-3.5', onRemove ? 'pr-1.5' : 'pr-3.5')}>
      {avatar ? <Avatar name={avatar.name} uri={avatar.uri} size={24} /> : null}
      <Text variant="body-sm" numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          className="h-5 w-5 items-center justify-center rounded-full bg-surface-2"
        >
          <Icon icon={IconX} size={12} tone="secondary" strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}
