import { IconChevronDown, IconPlus } from '@tabler/icons-react-native';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { BottomSheet } from './ui/BottomSheet';
import { FieldShell, InputBox } from './ui/Field';
import { Icon, type IconComponent } from './ui/Icon';
import { ListRow } from './ui/ListRow';
import { Pill } from './ui/Pill';
import { PressableScale } from './ui/PressableScale';
import { SearchBar } from './ui/SearchBar';
import { Skeleton } from './ui/Skeleton';
import { Text } from './ui/Text';

export type SheetOption = {
  value: string;
  label: string;
  /** Short form shown as a pill and matched by the search ("SCA"). */
  code?: string;
  /** Options are listed under their section heading, in the order given. */
  section?: string;
};

type Props = {
  label: string;
  required?: boolean;
  placeholder: string;
  sheetTitle: string;
  searchPlaceholder?: string;
  value: string | null;
  options: SheetOption[];
  onChange: (value: string) => void;
  loading?: boolean;
  error?: string;
  helper?: string;
  leadingIcon?: IconComponent;
  /** Adds a row "Add "<typed text>"" when the search matches nothing exactly. */
  onAddNew?: (text: string) => void;
  addNewLabel?: string;
};

type Item = { kind: 'header'; key: string; title: string } | { kind: 'option'; key: string; option: SheetOption } | { kind: 'add'; key: string; text: string };

/**
 * A field that opens a full-height sheet with a search box and the options listed (the same look
 * and feel as Select court). Matches the label or the short code.
 */
export function SheetPicker({ label, required, placeholder, sheetTitle, searchPlaceholder = 'Search', value, options, onChange, loading, error, helper, leadingIcon, onAddNew, addNewLabel = 'Add' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q) || !!o.code?.toLowerCase().includes(q)) : options;
    // Exact short-code matches first ("sca" -> SCA).
    const ordered = q ? [...shown].sort((a, b) => Number(b.code?.toLowerCase() === q) - Number(a.code?.toLowerCase() === q)) : shown;
    const out: Item[] = [];
    let section: string | undefined;
    for (const o of ordered) {
      if (!q && o.section && o.section !== section) {
        section = o.section;
        out.push({ kind: 'header', key: `h-${section}`, title: section });
      }
      out.push({ kind: 'option', key: o.value, option: o });
    }
    const text = query.trim();
    if (onAddNew && text.length >= 2 && !options.some((o) => o.label.toLowerCase() === text.toLowerCase())) out.push({ kind: 'add', key: 'add', text });
    return out;
  }, [options, query, onAddNew]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <FieldShell label={label} required={required} error={error} helper={helper}>
      <PressableScale scaleTo={1} onPress={() => setOpen(true)} accessibilityRole="combobox" accessibilityLabel={`${label}${selected ? `, ${selected.label}` : ''}`}>
        <InputBox focused={open} error={!!error}>
          {leadingIcon ? <Icon icon={leadingIcon} size={20} tone={selected ? 'primary' : 'tertiary'} /> : null}
          <Text variant="body" tone={selected ? 'default' : 'tertiary'} numberOfLines={1} className="flex-1">
            {selected?.label ?? (loading ? 'Loading…' : placeholder)}
          </Text>
          {selected?.code && selected.code !== selected.label ? <Pill label={selected.code} size="sm" /> : null}
          <Icon icon={IconChevronDown} size={20} tone="tertiary" />
        </InputBox>
      </PressableScale>

      <BottomSheet open={open} onClose={close} title={sheetTitle} snapPoints={['90%']} avoidKeyboard={false}>
        <View className="px-5 pb-3">
          <SearchBar value={query} onChangeText={setQuery} placeholder={searchPlaceholder} variant="outline" />
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-6"
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <Text variant="overline" tone="tertiary" className="px-5 pb-1 pt-3">
                {item.title}
              </Text>
            ) : item.kind === 'add' ? (
              <ListRow
                title={`${addNewLabel} "${item.text}"`}
                leadingIcon={IconPlus}
                leadingTone="primary"
                onPress={() => {
                  onAddNew?.(item.text);
                  close();
                }}
              />
            ) : (
              <ListRow
                title={item.option.label}
                trailing={item.option.code && item.option.code !== item.option.label ? <Pill label={item.option.code} size="sm" tone={item.option.value === value ? 'primary' : 'neutral'} /> : undefined}
                onPress={() => {
                  onChange(item.option.value);
                  close();
                }}
              />
            )
          }
          ListEmptyComponent={
            loading ? (
              <View className="gap-3 px-5 pt-2">
                <Skeleton width="80%" height={16} />
                <Skeleton width="60%" height={16} />
              </View>
            ) : (
              <Text variant="body" tone="secondary" className="px-5 pt-4">
                {query.trim() ? `Nothing matches "${query.trim()}".` : 'Nothing to choose from.'}
              </Text>
            )
          }
        />
      </BottomSheet>
    </FieldShell>
  );
}
