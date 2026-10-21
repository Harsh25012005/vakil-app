import { IconChevronDown, IconPlus } from '@tabler/icons-react-native';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Dropdown, MenuEmpty, MenuItem } from '@/components/ui/Dropdown';
import { FieldShell, InputBox } from '@/components/ui/Field';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SearchBar } from '@/components/ui/SearchBar';
import { Text } from '@/components/ui/Text';

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconComponent;
};

/** Dropdown gets a search field when there are more options than this (FRS CMP-10). */
export const SEARCH_THRESHOLD = 8;

export type SelectProps<T extends string> = {
  label?: string;
  placeholder?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  required?: boolean;
  helper?: string;
  error?: string;
  disabled?: boolean;
  leadingIcon?: IconComponent;
  /** Shows an "Add new" row (courts, case types). Receives the current search text. */
  onAddNew?: (query: string) => void;
  addNewLabel?: string;
};

/** CMP-10. Field-styled trigger with a chevron; opens an anchored dropdown list. */
export function Select<T extends string>({
  label,
  placeholder = 'Select',
  value,
  options,
  onChange,
  required,
  helper,
  error,
  disabled,
  leadingIcon,
  onAddNew,
  addNewLabel = 'Add new',
}: SelectProps<T>) {
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const searchable = options.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Description too, so a short code ("SCA") finds its case type.
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || !!o.description?.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <FieldShell label={label} required={required} helper={helper} error={error}>
      <View ref={anchor} collapsable={false}>
        <PressableScale
          scaleTo={1}
          disabled={disabled}
          onPress={() => setOpen(true)}
          accessibilityRole="combobox"
          accessibilityState={{ expanded: open, disabled: !!disabled }}
          accessibilityLabel={`${label ?? placeholder}${selected ? `, ${selected.label}` : ''}`}
        >
          <InputBox focused={open} error={!!error}>
            {leadingIcon ? <Icon icon={leadingIcon} size={20} tone={open ? 'primary' : 'tertiary'} /> : null}
            <Text variant="body" tone={selected ? 'default' : 'tertiary'} numberOfLines={1} className="flex-1">
              {selected?.label ?? placeholder}
            </Text>
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
      >
        {filtered.map((o) => (
          <MenuItem
            key={o.value}
            label={o.label}
            description={o.description}
            icon={o.icon}
            selected={o.value === value}
            onPress={() => {
              onChange(o.value);
              close();
            }}
          />
        ))}
        {filtered.length === 0 && !onAddNew ? <MenuEmpty /> : null}
        {onAddNew ? (
          <MenuItem
            label={query.trim() ? `${addNewLabel} "${query.trim()}"` : addNewLabel}
            icon={IconPlus}
            control="none"
            onPress={() => {
              onAddNew(query.trim());
              close();
            }}
          />
        ) : null}
      </Dropdown>
    </FieldShell>
  );
}
