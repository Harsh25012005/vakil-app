import { forwardRef } from 'react';
import type { TextInput } from 'react-native';
import { formatPhone } from '@/utils/format';
import { TextField, type TextFieldProps } from '@/components/ui/TextField';

export type PhoneInputProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'prefix' | 'keyboardType' | 'maxLength'> & {
  /** 10 raw digits, no prefix. */
  value: string;
  onChangeText: (digits: string) => void;
};

/** CMP-14. Fixed +91 prefix, numeric keypad, "98765 43210" mask. Validation lives in @vakil/shared. */
export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(function PhoneInput(
  { value, onChangeText, label = 'Mobile number', placeholder = '98765 43210', ...rest },
  ref,
) {
  return (
    <TextField
      ref={ref}
      label={label}
      placeholder={placeholder}
      prefix="+91"
      keyboardType="number-pad"
      textContentType="telephoneNumber"
      autoComplete="tel"
      maxLength={11}
      value={formatPhone(value)}
      onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, 10))}
      style={{ fontVariant: ['tabular-nums'] }}
      {...rest}
    />
  );
});
