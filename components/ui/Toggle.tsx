import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion, palette } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';

export type ToggleProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** With a label the whole row becomes the touch target ("label row" variant). */
  label?: string;
  description?: string;
};

const TRACK_W = 52;
const THUMB = 26;
const PAD = 3;

/** CMP-18. 52 x 32 track, on = primary, white thumb, 120 ms. */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled, label, description }: ToggleProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: motion.fast });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.borderStrong, colors.primary]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_W - THUMB - PAD * 2) }],
  }));

  const toggle = () => {
    haptic.light();
    onValueChange(!value);
  };

  const track = (
    <Animated.View style={[{ width: TRACK_W, height: 32, borderRadius: 16, padding: PAD }, trackStyle]}>
      <Animated.View
        style={[
          { width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: palette.white, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
          thumbStyle,
        ]}
      />
    </Animated.View>
  );

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      hitSlop={label ? 0 : 8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}
      className={label ? 'min-h-[52px] flex-row items-center gap-4' : undefined}
    >
      {label ? (
        <View className="flex-1">
          <Text variant="body">{label}</Text>
          {description ? (
            <Text variant="body-sm" tone="tertiary">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
      {track}
    </Pressable>
  );
}
