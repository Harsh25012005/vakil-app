import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

export type FieldShellProps = {
  label?: string;
  required?: boolean;
  helper?: string;
  /** Error wins over warning, warning wins over helper. */
  error?: string;
  warning?: string;
  counter?: { value: number; max: number };
  className?: string;
  children: ReactNode;
};

/** Label above (body-sm text-2), helper / error below (caption). Shared by every input. */
export function FieldShell({ label, required, helper, error, warning, counter, className, children }: FieldShellProps) {
  const message = error ?? warning ?? helper;
  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <Text variant="body-sm" tone="secondary">
          {label}
          {required ? <Text variant="body-sm" tone="error">{' *'}</Text> : null}
        </Text>
      ) : null}
      {children}
      {message || counter ? (
        <View className="flex-row gap-3 px-1">
          <Text
            variant="caption"
            tone={error ? 'error' : warning ? 'warning' : 'tertiary'}
            accessibilityLiveRegion={error ? 'polite' : 'none'}
            className="flex-1"
          >
            {message ?? ''}
          </Text>
          {counter ? (
            <Text variant="caption" tone={counter.value > counter.max ? 'error' : 'tertiary'} tabular>
              {`${counter.value}/${counter.max}`}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export type InputBoxProps = {
  focused?: boolean;
  error?: boolean;
  disabled?: boolean;
  variant?: 'filled' | 'outline';
  /** field = 52 dp, search = 44 dp. Both are pills; multiline is rounded-lg (16). */
  shape?: 'field' | 'search';
  multiline?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * The single input chrome: 52 dp pill (16 when multiline), surface-2 fill, 2 dp border (primary on focus, error red).
 * Light theme adds a hairline border at rest (a grey fill on a grey page alone is too faint).
 */
export function InputBox({ focused, error, disabled, variant = 'filled', shape = 'field', multiline, className, children }: InputBoxProps) {
  const { scheme } = useTheme();
  // Every single-line input is a full pill; the multiline TextArea keeps a soft 16 radius.
  const pill = !multiline;
  const round = pill ? 'rounded-full' : 'rounded-lg';
  const restBorder = 'border-border-strong';
  // One border, same 2 dp width in every state (transparent at rest) so focusing never shifts
  // layout. A separate semi-transparent outer ring drew as a doubled edge on Android.
  return (
    <View
      className={cn(
        'flex-row gap-3 border',
        pill ? 'px-4' : 'px-3.5',
        round,
        multiline ? 'items-start py-3' : 'items-center',
        shape === 'search' ? 'min-h-[44px]' : 'min-h-[52px]',
        variant === 'filled' ? 'bg-surface-2' : 'bg-transparent',
        error ? 'border-error' : focused ? 'border-primary' : restBorder,
        disabled && 'opacity-40',
        className,
      )}
    >
      {children}
    </View>
  );
}

/** Text style for every TextInput in the system (font size only; RN TextInput mis-renders lineHeight). */
// outline-none: on web the browser's own focus outline would double up with InputBox's ring.
export const inputTextClass = 'flex-1 font-sans text-[15px] text-text outline-none';
