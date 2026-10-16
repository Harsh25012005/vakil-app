import { IconX } from '@tabler/icons-react-native';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { elevation, motion, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Height as a fraction of the screen ('50%', '90%', '100%') or dp. Omit for auto-height
   * (content-sized, capped at 90%). Only the first value is used.
   */
  snapPoints?: (string | number)[];
  footer?: ReactNode;
  showClose?: boolean;
  children: ReactNode;
};

const CLOSE_DISTANCE = 0.25; // drag past 25% of the sheet height to dismiss
const CLOSE_VELOCITY = 0.9; // px/ms

/**
 * CMP-52. rounded-2xl (28) top corners, surface-2, scrim, drag-to-dismiss, 300 ms spring.
 *
 * Deliberately plain: React Native Modal + core Animated (native driver) + PanResponder.
 * Verified on an Android emulator, where a portal-based sheet rendered behind the native screen
 * container, and Reanimated shared-value styles inside a Modal never painted.
 */
export function BottomSheet({ open, onClose, title, snapPoints, footer, showClose = true, children }: BottomSheetProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const [visible, setVisible] = useState(open);
  const [sheetH, setSheetH] = useState(0);
  const heightRef = useRef(0);
  heightRef.current = sheetH;

  const translateY = useRef(new Animated.Value(screenH)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion.current = v));
  }, []);

  const snap = snapPoints?.[0];
  const fixedHeight = typeof snap === 'number' ? snap : typeof snap === 'string' ? (parseFloat(snap) / 100) * screenH : undefined;

  const animateIn = (h: number) => {
    translateY.setValue(h);
    Animated.parallel([
      Animated.timing(scrim, { toValue: 1, duration: motion.base, useNativeDriver: true }),
      reduceMotion.current
        ? Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true })
        : Animated.spring(translateY, { toValue: 0, ...motion.spring, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (open) {
      setVisible(true);
      if (heightRef.current) animateIn(heightRef.current);
      return;
    }
    if (!visible) return;
    Animated.parallel([
      Animated.timing(scrim, { toValue: 0, duration: motion.base, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: heightRef.current || screenH, duration: reduceMotion.current ? 0 : motion.base, useNativeDriver: true }),
    ]).start(() => setVisible(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => translateY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > heightRef.current * CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) onClose();
          else Animated.spring(translateY, { toValue: 0, ...motion.spring, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, ...motion.spring, useNativeDriver: true }).start(),
      }),
    [onClose, translateY],
  );

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: scrim }]}>
          <Pressable accessibilityLabel="Close sheet" onPress={onClose} style={{ flex: 1 }} />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            const first = heightRef.current === 0;
            heightRef.current = h;
            setSheetH(h);
            if (first && open) animateIn(h);
          }}
          style={[
            {
              backgroundColor: colors.surface2,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              maxHeight: screenH * 0.9,
              height: fixedHeight,
              paddingBottom: insets.bottom + 8,
              transform: [{ translateY }],
            },
            elevation(4, scheme),
          ]}
        >
          {/* Drag zone: handle + header. Content below stays free to scroll. */}
          <View {...pan.panHandlers}>
            <View className="items-center pb-2 pt-3">
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} />
            </View>
            {title || showClose ? (
              <View className="flex-row items-center gap-2 pb-2 pl-5 pr-3">
                <Text variant="title" className="flex-1" accessibilityRole="header">
                  {title ?? ''}
                </Text>
                {showClose ? <IconButton icon={IconX} accessibilityLabel="Close" onPress={onClose} variant="ghost" size="md" /> : null}
              </View>
            ) : null}
          </View>

          <View style={fixedHeight ? { flex: 1 } : { flexShrink: 1 }}>{children}</View>
          {footer ? <View className="gap-3 px-5 pt-1">{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
