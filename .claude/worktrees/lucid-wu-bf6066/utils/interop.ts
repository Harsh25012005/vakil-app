// Lets third-party components accept `className`. Imported once at the root.
//
// Reanimated components (Animated.View / Text) are registered on WEB ONLY, at the bottom. On native,
// NativeWind already supports them and an explicit cssInterop makes it drop every className once
// the component also receives an animated style. Verified on an Android emulator.
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { Platform } from 'react-native';
import Animated from 'react-native-reanimated';

cssInterop(LinearGradient, { className: 'style' });
cssInterop(BlurView, { className: 'style' });

// Web only: react-native-web does not pick up className on Reanimated components by itself,
// while native NativeWind handles them natively (and breaks if we register them there).
if (Platform.OS === 'web') {
  cssInterop(Animated.View, { className: 'style' });
  cssInterop(Animated.Text, { className: 'style' });
}
