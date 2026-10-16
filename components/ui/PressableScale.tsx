import { cssInterop } from 'nativewind';
import { forwardRef, type ReactNode } from 'react';
import { Platform, Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '@/constants/theme';
import { haptic, type HapticKind } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// className on a Reanimated component needs registering on web only (see utils/interop.ts).
if (Platform.OS === 'web') cssInterop(AnimatedPressable, { className: 'style' });

export type PressableScaleProps = Omit<PressableProps, 'children' | 'style'> & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** FRS 3.6 press-scale. Pass 1 to disable. */
  scaleTo?: number;
  haptic?: HapticKind;
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
};

/**
 * Base for every tappable surface: 0.97 press scale (120 ms), 40% disabled opacity,
 * optional haptic. Respects Reduce Motion.
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { scaleTo = motion.pressScale, haptic: hapticKind, disabled, onPressIn, onPressOut, onPress, style, children, ...rest },
  ref,
) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={(e) => {
        if (!reduceMotion) scale.value = withTiming(scaleTo, { duration: motion.fast });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: motion.fast });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticKind) haptic[hapticKind]();
        onPress?.(e);
      }}
      style={[animatedStyle, disabled ? { opacity: 0.4 } : null, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
