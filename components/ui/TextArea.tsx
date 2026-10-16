import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { FieldShell, InputBox, inputTextClass } from '@/components/ui/Field';
import type { InputComponentType } from '@/components/ui/TextField';

const LINE = 22;
const MIN_LINES = 3;
const MAX_LINES = 10;

export type TextAreaProps = Omit<TextInputProps, 'multiline'> & {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  showCounter?: boolean;
  disabled?: boolean;
  containerClassName?: string;
  InputComponent?: InputComponentType;
};

/** CMP-08. Auto-grows from 3 to 10 lines (min height 104), then scrolls. */
export const TextArea = forwardRef<TextInput, TextAreaProps>(function TextArea(
  { label, required, helper, error, showCounter, disabled, containerClassName, InputComponent = TextInput, value, maxLength, onFocus, onBlur, style, ...rest },
  ref,
) {
  const { colors } = useTheme();
  // BottomSheetTextInput wraps RN TextInput with identical props; only its ref type differs.
  const Input = InputComponent as typeof TextInput;
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState(LINE * MIN_LINES);

  return (
    <FieldShell
      label={label}
      required={required}
      helper={helper}
      error={error}
      counter={showCounter && maxLength ? { value: value?.length ?? 0, max: maxLength } : undefined}
      className={containerClassName}
    >
      <InputBox focused={focused} error={!!error} disabled={disabled} multiline className="min-h-[104px]">
        <Input
          ref={ref}
          multiline
          value={value}
          maxLength={maxLength}
          editable={!disabled}
          textAlignVertical="top"
          accessibilityLabel={label}
          placeholderTextColor={colors.text3}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          className={inputTextClass}
          style={[{ paddingVertical: 0, lineHeight: LINE, height: Math.min(Math.max(height, LINE * MIN_LINES), LINE * MAX_LINES) }, style]}
          onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height)}
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
      </InputBox>
    </FieldShell>
  );
});
