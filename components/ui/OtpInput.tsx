import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

export type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  /** Turns the circles red and shakes them. No message is shown. */
  error?: boolean | string;
  success?: boolean;
  autoFocus?: boolean;
};

/** CMP-15. 4 circles, 56 x 56 (width = height, rounded-full), auto-advance, paste + SMS autofill, shake on error. */
export function OtpInput({ value, onChange, onComplete, length = 4, error, success, autoFocus = true }: OtpInputProps) {
  const { colors } = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!error) return;
    haptic.warning();
    shake.value = withSequence(withTiming(-8, { duration: 50 }), withRepeat(withTiming(8, { duration: 80 }), 4, true), withTiming(0, { duration: 50 }));
  }, [error, shake]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <View className="gap-2">
      <Pressable onPress={() => input.current?.focus()} accessibilityLabel={`One-time code, ${value.length} of ${length} digits entered`}>
        <Animated.View style={shakeStyle} className={cn('flex-row justify-start', length > 4 ? 'gap-2' : 'gap-3')}>
          {Array.from({ length }, (_, i) => {
            const char = value[i] ?? '';
            const active = focused && i === Math.min(value.length, length - 1);
            return (
              <View
                key={i}
                className={cn(
                  // Six boxes must still fit a 375 pt wide phone.
                  length > 4 ? 'h-11 w-11' : 'h-14 w-14',
                  'items-center justify-center rounded-full border bg-surface-2',
                  error ? 'border-error' : success ? 'border-success' : active ? 'border-primary' : char ? 'border-border-strong' : 'border-transparent',
                )}
              >
                <Text variant="h3" tabular>
                  {char}
                </Text>
              </View>
            );
          })}
        </Animated.View>
        <TextInput
          ref={input}
          value={value}
          autoFocus={autoFocus}
          onChangeText={(t) => {
            const code = t.replace(/\D/g, '').slice(0, length);
            onChange(code);
            if (code.length === length) onComplete?.(code);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={length}
          caretHidden
          selectionColor={colors.primary}
          className="absolute inset-0 opacity-0"
        />
      </Pressable>
    </View>
  );
}
