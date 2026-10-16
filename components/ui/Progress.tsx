import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { cn } from '@/utils/cn';
import { motion, palette, status } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type LinearProps = {
  /** 0..1. Ignored when indeterminate. */
  value?: number;
  indeterminate?: boolean;
  tone?: 'brand' | 'success' | 'warning';
  className?: string;
  accessibilityLabel?: string;
};

const fillClass = { brand: 'bg-primary', success: 'bg-success', warning: 'bg-warning' } as const;

/** CMP-34 linear: 6 dp track, rounded-full. */
export function LinearProgress({ value = 0, indeterminate, tone = 'brand', className, accessibilityLabel }: LinearProps) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const sweep = useSharedValue(0);
  const clamped = Math.max(0, Math.min(1, value));

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: reduceMotion ? 0 : motion.base });
  }, [clamped, reduceMotion, progress]);

  useEffect(() => {
    if (indeterminate && !reduceMotion) sweep.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [indeterminate, reduceMotion, sweep]);

  const fillStyle = useAnimatedStyle(() =>
    indeterminate
      ? { width: width * 0.4, transform: [{ translateX: -width * 0.4 + sweep.value * width * 1.4 }] }
      : { width: width * progress.value },
  );

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={indeterminate ? undefined : { min: 0, max: 100, now: Math.round(clamped * 100) }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <Animated.View style={[{ height: '100%', borderRadius: 999, overflow: 'hidden' }, fillStyle]} className={fillClass[tone]}>
      </Animated.View>
    </View>
  );
}

type RingProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'brand' | 'success';
  /** For rings drawn on a colored fill. */
  inverse?: boolean;
  children?: ReactNode;
  accessibilityLabel?: string;
};

/** CMP-34 ring: fee paid %. Starts at 12 o'clock, round caps. */
export function RingProgress({ value, size = 72, strokeWidth = 6, tone = 'brand', inverse, children, accessibilityLabel }: RingProps) {
  const { colors } = useTheme();
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const track = inverse ? 'rgba(255,255,255,0.25)' : colors.surface2;
  const stroke = inverse ? palette.white : tone === 'success' ? status.success.base : colors.primary;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - clamped)}
            fill="none"
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
