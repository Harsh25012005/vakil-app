import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { status } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

type ActionTone = 'brand' | 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'adjourned';

export type SwipeAction = {
  key: string;
  label: string;
  icon: IconComponent;
  /** Color = action meaning (FRS CMP-06). */
  tone: ActionTone;
  onPress: () => void;
};

type Props = {
  /** Leading = status actions, trailing = edit / delete. */
  leading?: SwipeAction[];
  trailing?: SwipeAction[];
  children: ReactNode;
  /** Row background; defaults to surface. Pass 'bg-bg' for rows that sit directly on the page. */
  className?: string;
};

const ACTION_WIDTH = 72;

/** CMP-06. 72 dp actions, haptic when the row passes the open threshold. */
export function SwipeableRow({ leading, trailing, children, className = 'bg-surface' }: Props) {
  const { colors } = useTheme();

  const bgFor = (tone: ActionTone) =>
    tone === 'brand' ? colors.primary : tone === 'neutral' ? colors.borderStrong : status[tone].base;

  const renderActions = (actions: SwipeAction[] | undefined) =>
    actions?.length
      ? (_p: unknown, _t: unknown, methods: SwipeableMethods) => (
          <View className="flex-row">
            {actions.map((a) => (
              <Pressable
                key={a.key}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                onPress={() => {
                  methods.close();
                  a.onPress();
                }}
                style={{ width: ACTION_WIDTH, backgroundColor: bgFor(a.tone) }}
                className="items-center justify-center gap-1"
              >
                <Icon icon={a.icon} size={24} tone="on-primary" />
                <Text variant="caption" tone="on-primary">
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      : undefined;

  return (
    <ReanimatedSwipeable
      friction={2}
      overshootFriction={8}
      leftThreshold={ACTION_WIDTH / 2}
      rightThreshold={ACTION_WIDTH / 2}
      renderLeftActions={renderActions(leading)}
      renderRightActions={renderActions(trailing)}
      onSwipeableWillOpen={() => haptic.light()}
    >
      <View className={className}>{children}</View>
    </ReanimatedSwipeable>
  );
}
