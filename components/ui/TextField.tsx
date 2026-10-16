import { IconX } from '@tabler/icons-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { FieldShell, InputBox, inputTextClass } from '@/components/ui/Field';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

/** Swap the underlying input (e.g. a gesture-aware input inside custom overlays). */
export type InputComponentType = typeof TextInput;

export type TextFieldProps = Omit<TextInputProps, 'editable'> & {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  warning?: string;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  onTrailingPress?: () => void;
  trailingAccessibilityLabel?: string;
  /** "+91", "₹" ... */
  prefix?: string;
  suffix?: ReactNode;
  clearable?: boolean;
  variant?: 'filled' | 'outline';
  showCounter?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  containerClassName?: string;
  /** Pass BottomSheetTextInput when the field lives inside a bottom sheet. */
  InputComponent?: InputComponentType;
};

/** CMP-07. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    required,
    helper,
    error,
    warning,
    leadingIcon,
    trailingIcon,
    onTrailingPress,
    trailingAccessibilityLabel,
    prefix,
    suffix,
    clearable,
    variant = 'filled',
    showCounter,
    disabled,
    readOnly,
    containerClassName,
    InputComponent = TextInput,
    value,
    onChangeText,
    onFocus,
    onBlur,
    maxLength,
    style,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  // BottomSheetTextInput wraps RN TextInput with identical props; only its ref type differs.
  const Input = InputComponent as typeof TextInput;
  const [focused, setFocused] = useState(false);
  const editable = !disabled && !readOnly;

  return (
    <FieldShell
      label={label}
      required={required}
      helper={helper}
      error={error}
      warning={warning}
      counter={showCounter && maxLength ? { value: value?.length ?? 0, max: maxLength } : undefined}
      className={containerClassName}
    >
      <InputBox focused={focused} error={!!error} disabled={disabled} variant={variant}>
        {leadingIcon ? <Icon icon={leadingIcon} size={20} tone={focused ? 'primary' : 'tertiary'} /> : null}
        {prefix ? (
          <Text variant="body" tone="secondary" tabular>
            {prefix}
          </Text>
        ) : null}
        <Input
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          maxLength={maxLength}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.text3}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          className={inputTextClass}
          style={[{ paddingVertical: 0, minHeight: 24 }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {clearable && focused && value ? (
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear"
            onPress={() => onChangeText?.('')}
            className="h-5 w-5 items-center justify-center rounded-full bg-border-strong"
          >
            <Icon icon={IconX} size={12} tone="default" strokeWidth={2.5} />
          </Pressable>
        ) : null}
        {suffix}
        {trailingIcon ? (
          <Pressable
            disabled={!onTrailingPress}
            onPress={onTrailingPress}
            hitSlop={12}
            accessibilityRole={onTrailingPress ? 'button' : undefined}
            accessibilityLabel={trailingAccessibilityLabel}
          >
            <Icon icon={trailingIcon} size={20} tone="tertiary" />
          </Pressable>
        ) : null}
      </InputBox>
    </FieldShell>
  );
});
