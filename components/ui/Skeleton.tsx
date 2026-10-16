import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { radius as radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  className?: string;
};

/** CMP-51 base block. grad-shimmer sweep, 1.2 s loop; static under Reduce Motion. */
export function Skeleton({ width = '100%', height = 14, radius = radii.sm, className }: SkeletonProps) {
  const { scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [w, setW] = useState(0);
  const t = useSharedValue(0);

  useEffect(() => {
    if (!reduceMotion) t.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [reduceMotion, t]);

  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: -w + t.value * w * 2 }] }));
  const highlight = scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ width, height, borderRadius: radius }}
      className={cn('overflow-hidden bg-surface-2', className)}
    >
      {!reduceMotion && w > 0 ? (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: w }, sweep]}>
          <LinearGradient colors={['transparent', highlight, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function SkeletonText({ lines = 2, className }: { lines?: number; className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '60%' : '100%'} height={12} />
      ))}
    </View>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius={size / 2} />;
}

export function SkeletonRow() {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <SkeletonAvatar />
      <View className="flex-1 gap-2">
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={12} />
      </View>
    </View>
  );
}

/** Mirrors CaseCard's layout so the swap to real data doesn't jump. */
export function SkeletonCard() {
  return (
    <Card>
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-2">
          <Skeleton width="80%" height={16} />
          <Skeleton width="35%" height={12} />
        </View>
        <Skeleton width={72} height={22} radius={radii.full} />
      </View>
      <View className="mt-4 gap-2">
        <Skeleton width="50%" height={12} />
        <Skeleton width="40%" height={12} />
      </View>
    </Card>
  );
}
