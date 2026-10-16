import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';
import { motion } from '@/constants/theme';
import { haptic } from '@/utils/haptics';

export type TabItem<T extends string> = { key: T; label: string; count?: number };

export type TabsProps<T extends string> = {
  tabs: TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  /** underline = case detail sections, pill = filter groups. */
  variant?: 'underline' | 'pill';
  className?: string;
};

/** CMP-47. Scrollable, 44 dp, indicator slides 200 ms. */
export function Tabs<T extends string>({ tabs, value, onChange, variant = 'underline', className }: TabsProps<T>) {
  const reduceMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const active = layouts[value];

  useEffect(() => {
    if (!active) return;
    const cfg = { duration: reduceMotion ? 0 : motion.base };
    x.value = withTiming(active.x, cfg);
    w.value = withTiming(active.width, cfg);
  }, [active, reduceMotion, x, w]);

  const indicatorStyle = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));
  const pill = variant === 'pill';

  return (
    <View className={cn(!pill && 'border-b border-border', className)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName={cn(pill ? 'gap-2 px-5 py-1' : 'px-3')}>
        <View className="flex-row" accessibilityRole="tablist">
          {active ? (
            <Animated.View
              pointerEvents="none"
              style={indicatorStyle}
              className={cn('absolute left-0', pill ? 'bottom-0 top-0 rounded-full border border-primary bg-primary-subtle' : 'bottom-0 h-0.5 rounded-full bg-primary')}
            />
          ) : null}
          {tabs.map((t) => {
            const selected = t.key === value;
            return (
              <Pressable
                key={t.key}
                onLayout={(e) => {
                  const { x: lx, width } = e.nativeEvent.layout;
                  setLayouts((prev) => (prev[t.key]?.x === lx && prev[t.key]?.width === width ? prev : { ...prev, [t.key]: { x: lx, width } }));
                }}
                onPress={() => {
                  if (!selected) {
                    haptic.selection();
                    onChange(t.key);
                  }
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={t.count !== undefined ? `${t.label}, ${t.count}` : t.label}
                className={cn('flex-row items-center justify-center gap-1.5', pill ? 'mr-2 h-9 rounded-full px-4' : 'h-11 px-3')}
              >
                <Text variant="button" tone={selected ? (pill ? 'primary' : 'default') : 'tertiary'}>
                  {t.label}
                </Text>
                {t.count !== undefined ? (
                  <Text variant="caption" tone={selected ? 'primary' : 'tertiary'} tabular>
                    {String(t.count)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
