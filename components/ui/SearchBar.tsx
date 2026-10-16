import { IconAdjustmentsHorizontal, IconSearch, IconX } from '@tabler/icons-react-native';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';
import { InputBox, inputTextClass } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { LinkText } from '@/components/ui/LinkText';
import type { InputComponentType } from '@/components/ui/TextField';

export type SearchBarProps = {
  value: string;
  onChangeText: (q: string) => void;
  /** Fires 300 ms after typing stops (FRS CMP-09). */
  onDebouncedChange?: (q: string) => void;
  placeholder?: string;
  loading?: boolean;
  autoFocus?: boolean;
  /** "With filter" variant: shows the filter button with active-filter count. */
  onFilterPress?: () => void;
  filterCount?: number;
  /** "Expanded" variant: shows Cancel. */
  onCancel?: () => void;
  /** outline = visible stroke (used inside dropdowns, where the field sits on surface-2). */
  variant?: 'filled' | 'outline';
  InputComponent?: InputComponentType;
  className?: string;
};

/** CMP-09. 44 dp, rounded-full. */
export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  {
    value,
    onChangeText,
    onDebouncedChange,
    placeholder = 'Search cases, clients, courts',
    loading,
    autoFocus,
    onFilterPress,
    filterCount,
    onCancel,
    variant = 'filled',
    InputComponent = TextInput,
    className,
  },
  ref,
) {
  const { colors } = useTheme();
  // BottomSheetTextInput wraps RN TextInput with identical props; only its ref type differs.
  const Input = InputComponent as typeof TextInput;
  const [focused, setFocused] = useState(false);
  const debounced = useRef(onDebouncedChange);
  debounced.current = onDebouncedChange;

  useEffect(() => {
    const t = setTimeout(() => debounced.current?.(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <View className={cn('flex-row items-center gap-2', className)}>
      <View className="flex-1">
        <InputBox focused={focused} shape="search" variant={variant}>
          <Icon icon={IconSearch} size={20} tone={focused ? 'primary' : 'tertiary'} />
          <Input
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            autoFocus={autoFocus}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityRole="search"
            accessibilityLabel={placeholder}
            placeholderTextColor={colors.text3}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            className={inputTextClass}
            style={{ paddingVertical: 0 }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {loading ? <ActivityIndicator size="small" color={colors.text3} /> : null}
          {!loading && value ? (
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => onChangeText('')}
              className="h-5 w-5 items-center justify-center rounded-full bg-border-strong"
            >
              <Icon icon={IconX} size={12} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </InputBox>
      </View>
      {onFilterPress ? (
        <IconButton
          icon={IconAdjustmentsHorizontal}
          accessibilityLabel={filterCount ? `Filters, ${filterCount} active` : 'Filters'}
          onPress={onFilterPress}
          variant="tonal"
          size="md"
          shape="circle"
          badge={filterCount ? filterCount : undefined}
        />
      ) : null}
      {onCancel ? <LinkText label="Cancel" onPress={onCancel} className="self-center" /> : null}
    </View>
  );
});
