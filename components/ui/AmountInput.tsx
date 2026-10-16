import { forwardRef, useEffect, useState } from 'react';
import type { TextInput } from 'react-native';
import { groupINR } from '@/utils/format';
import { TextField, type TextFieldProps } from '@/components/ui/TextField';

/** Keeps what the user typed (incl. a trailing ".") while grouping the integer part. */
function formatTyping(raw: string): { text: string; amount: number | null } {
  const clean = raw.replace(/[^\d.]/g, '');
  const [intRaw = '', ...rest] = clean.split('.');
  const hasDot = clean.includes('.');
  const dec = rest.join('').slice(0, 2);
  const int = intRaw.replace(/^0+(?=\d)/, '').slice(0, 9);
  if (!int && !hasDot) return { text: '', amount: null };
  const grouped = groupINR(Number(int || '0'));
  const text = hasDot ? `${grouped}.${dec}` : grouped;
  return { text, amount: Number(`${int || '0'}.${dec || '0'}`) };
}

export type AmountInputProps = Omit<TextFieldProps, 'value' | 'onChange' | 'onChangeText' | 'prefix' | 'keyboardType'> & {
  value: number | null;
  onChange: (amount: number | null) => void;
};

/** CMP-16. ₹ prefix, Indian grouping (1,25,000), tabular numbers. */
export const AmountInput = forwardRef<TextInput, AmountInputProps>(function AmountInput({ value, onChange, placeholder = '0', ...rest }, ref) {
  const [text, setText] = useState(value == null ? '' : groupINR(value, Number.isInteger(value) ? 0 : 2));

  useEffect(() => {
    // Sync external resets without fighting the user's in-progress typing.
    const current = formatTyping(text).amount;
    if (value !== current) setText(value == null ? '' : groupINR(value, Number.isInteger(value) ? 0 : 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextField
      ref={ref}
      prefix="₹"
      keyboardType="decimal-pad"
      placeholder={placeholder}
      value={text}
      onChangeText={(raw) => {
        const next = formatTyping(raw);
        setText(next.text);
        onChange(next.amount);
      }}
      style={{ fontVariant: ['tabular-nums'] }}
      {...rest}
    />
  );
});
