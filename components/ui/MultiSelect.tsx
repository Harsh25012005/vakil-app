import { IconChevronDown } from '@tabler/icons-react-native';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Dropdown, MenuEmpty, MenuItem } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { InputChip } from '@/components/ui/Chip';
import { FieldShell, InputBox } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SearchBar } from '@/components/ui/SearchBar';
import { SEARCH_THRESHOLD, type SelectOption } from '@/components/ui/Select';
import { Text } from '@/components/ui/Text';

export type MultiSelectProps<T extends string> = {
  label?: string;
  placeholder?: string;
  values: T[];
  options: SelectOption<T>[];
  onChange: (values: T[]) => void;
  required?: boolean;
  helper?: string;
  error?: string;
};

/** CMP-11. Chips inside the field; anchored dropdown with checkboxes that apply instantly. */
export function MultiSelect<T extends string>({
  label,
  placeholder = 'Select',
  values,
  options,
  onChange,
  required,
  helper,
  error,
}: MultiSelectProps<T>) {
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchable = options.length > SEARCH_THRESHOLD;

  const selected = options.filter((o) => values.includes(o.value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      <View ref={anchor} collapsable={false}>
        <PressableScale
          scaleTo={1}
          onPress={() => setOpen(true)}
          accessibilityRole="combobox"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label ?? placeholder}, ${selected.length} selected`}
        >
          <InputBox focused={open} error={!!error} className="py-0">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1" contentContainerClassName="min-h-[28px] items-center gap-1.5 pr-2">
              {selected.length === 0 ? (
                <Text variant="body" tone="tertiary">
                  {placeholder}
                </Text>
              ) : (
                // Display-only: the whole field is one control, so chips can't hold their own
                // remove buttons (nested controls). Removal happens in the dropdown.
                selected.map((o) => <InputChip key={o.value} label={o.label} />)
              )}
            </ScrollView>
            <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
              <Icon icon={IconChevronDown} size={20} tone={open ? 'primary' : 'tertiary'} />
            </View>
          </InputBox>
        </PressableScale>
      </View>

      <Dropdown
        open={open}
        onClose={close}
        anchorRef={anchor}
        accessibilityLabel={label}
        header={searchable ? <SearchBar value={query} onChangeText={setQuery} placeholder="Search" variant="outline" /> : undefined}
        footer={
          <View className="flex-row items-center justify-between">
            <Text variant="caption" tone="tertiary">{`${values.length} selected`}</Text>
            <View className="flex-row gap-2">
              {values.length ? <Button label="Clear" variant="ghost" size="xs" onPress={() => onChange([])} /> : null}
              <Button label="Done" size="xs" onPress={close} />
            </View>
          </View>
        }
      >
        {filtered.map((o) => (
          <MenuItem key={o.value} label={o.label} description={o.description} control="checkbox" selected={values.includes(o.value)} onPress={() => toggle(o.value)} />
        ))}
        {filtered.length === 0 ? <MenuEmpty /> : null}
      </Dropdown>
    </FieldShell>
  );
}
