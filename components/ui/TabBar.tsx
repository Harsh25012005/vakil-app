import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';
import { sizes } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';

/** Props expo-router passes to a custom tab bar (derived so it tracks the router's own types). */
export type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export type TabIcons = Record<string, { icon: IconComponent; activeIcon?: IconComponent }>;

/**
 * CMP-45. 64 dp + inset, surface with blur 20 and top border; active = filled (or bolder) icon,
 * primary label and a 4 dp pill indicator. Positioned absolutely so content scrolls under the blur;
 * screens pad their bottom with useTabBarInset().
 */
export function TabBar({ state, descriptors, navigation, icons }: BottomTabBarProps & { icons: TabIcons }) {
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
  const ios = Platform.OS === 'ios';

  return (
    <View className="absolute bottom-0 left-0 right-0 border-t border-border" style={{ paddingBottom: insets.bottom }}>
      {ios ? <BlurView intensity={20} tint={scheme} className="absolute inset-0" /> : null}
      <View className={cn('absolute inset-0', ios ? 'bg-surface/80' : 'bg-surface')} />
      <View className="flex-row" style={{ height: sizes.tabBar }} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = options?.title ?? route.name;
          const cfg = icons[route.name];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptic.selection();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              className="flex-1 items-center justify-center gap-1"
            >
              <View className={cn('absolute top-0 h-1 w-8 rounded-b-full', focused ? 'bg-primary' : 'bg-transparent')} />
              {cfg ? (
                <Icon
                  icon={focused && cfg.activeIcon ? cfg.activeIcon : cfg.icon}
                  size={24}
                  tone={focused ? 'brand' : 'tertiary'}
                  strokeWidth={focused && !cfg.activeIcon ? 2.25 : undefined}
                />
              ) : null}
              <Text variant="caption" tone={focused ? 'primary' : 'tertiary'} className={cn(focused && 'font-sans-bold')}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Bottom padding for scroll content inside tab screens (tab bar + safe area + 16). */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return sizes.tabBar + insets.bottom + 16;
}
