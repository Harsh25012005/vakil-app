import { IconArrowLeft } from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';

export type TopAppBarProps = {
  title: string;
  /** large = 96 (title collapses on scroll), compact = 56, transparent = over a hero / gradient. */
  variant?: 'large' | 'compact' | 'transparent';
  onBack?: () => void;
  /** Trailing IconButtons. */
  actions?: ReactNode;
  /** Pass the list's scroll offset (useScrollViewOffset / useAnimatedScrollHandler) to animate. */
  scrollY?: SharedValue<number>;
  /** Replaces the title row with a search bar ("Search" variant). */
  search?: ReactNode;
};

const COLLAPSE = 40;

/** CMP-46. */
export function TopAppBar({ title, variant = 'compact', onBack, actions, scrollY, search }: TopAppBarProps) {
  const insets = useSafeAreaInsets();
  const large = variant === 'large';
  const inverse = variant === 'transparent';

  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: !large ? 1 : scrollY ? interpolate(scrollY.value, [COLLAPSE - 12, COLLAPSE], [0, 1], Extrapolation.CLAMP) : 0,
  }));
  const largeTitleStyle = useAnimatedStyle(() => {
    const y = scrollY?.value ?? 0;
    return {
      opacity: interpolate(y, [0, COLLAPSE], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(y, [0, COLLAPSE], [0, -8], Extrapolation.CLAMP) }],
    };
  });
  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [0, 8], [0, 1], Extrapolation.CLAMP) : 0,
  }));

  return (
    <View className={cn(!inverse && 'bg-bg')} style={{ paddingTop: insets.top }}>
      <View className="h-14 flex-row items-center gap-1 px-2">
        {onBack ? (
          <IconButton icon={IconArrowLeft} accessibilityLabel="Back" onPress={onBack} size="lg" tone={inverse ? 'on-primary' : 'default'} />
        ) : (
          <View className="w-3" />
        )}
        {search ? (
          <View className="flex-1 pr-2">{search}</View>
        ) : (
          <Animated.View style={compactTitleStyle} className="flex-1 px-1">
            <Text variant="title" tone={inverse ? 'on-primary' : 'default'} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          </Animated.View>
        )}
        {actions ? <View className="flex-row items-center gap-1 pr-1">{actions}</View> : null}
      </View>
      {large ? (
        <Animated.View style={largeTitleStyle} className="h-10 justify-end px-5">
          <Text variant="h1" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </Animated.View>
      ) : null}
      {!inverse ? <Animated.View style={hairlineStyle} className="absolute bottom-0 left-0 right-0 h-px bg-border" /> : null}
    </View>
  );
}
