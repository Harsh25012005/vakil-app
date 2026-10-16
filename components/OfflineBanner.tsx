import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner } from '@/components/ui/Banner';

/** SCR-50 / FRS 9.2: a persistent info banner while offline. Cached data stays readable underneath. */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false || s.isInternetReachable === false)), []);

  if (!offline) return null;
  return (
    <Animated.View entering={FadeInUp.duration(200)} exiting={FadeOutUp.duration(150)} pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 6 }}>
      <View>
        <Banner tone="offline" message="You're offline. Changes will sync when you're back." />
      </View>
    </Animated.View>
  );
}
