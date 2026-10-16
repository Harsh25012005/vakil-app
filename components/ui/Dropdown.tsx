import { IconCheck } from '@tabler/icons-react-native';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';
import { useTheme } from '@/hooks/useTheme';

type Anchor = { x: number; y: number; width: number; height: number };

export type DropdownProps = {
  open: boolean;
  onClose: () => void;
  /** The trigger to attach to. Wrap the trigger in a View with collapsable={false}. */
  anchorRef: RefObject<View | null>;
  maxHeight?: number;
  /** Pinned above the list (search field). */
  header?: ReactNode;
  /** Pinned below the list (Clear / Done). */
  footer?: ReactNode;
  accessibilityLabel?: string;
  children: ReactNode;
};

const GAP = 6;
const SCREEN_MARGIN = 16;

/**
 * Anchored dropdown menu: opens directly under its field at the same width, flips above when
 * there isn't room below, closes on outside tap / back. rounded-lg (16) panel, items rounded 10
 * (16 - 6 padding, concentric).
 */
export function Dropdown({ open, onClose, anchorRef, maxHeight = 320, header, footer, accessibilityLabel, children }: DropdownProps) {
  const { scheme } = useTheme();
  const layerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  // Where the modal layer itself sits in the window. On Android the trigger is measured below the
  // status bar while a statusBarTranslucent modal starts at the very top of the screen; working in
  // layer-relative coordinates makes the panel land under its field on every device and on web.
  const [layer, setLayer] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      setLayer(null);
      return;
    }
    anchorRef.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  }, [open, anchorRef]);

  if (!open || !anchor) return null;

  const ready = layer !== null;
  const top = anchor.y - (layer?.y ?? 0);
  const left = anchor.x - (layer?.x ?? 0);
  const layerH = layer?.height ?? 0;
  const spaceBelow = layerH - (top + anchor.height) - GAP - SCREEN_MARGIN;
  const spaceAbove = top - GAP - SCREEN_MARGIN;
  const openUp = spaceBelow < Math.min(maxHeight, 220) && spaceAbove > spaceBelow;
  const panelMax = Math.max(160, Math.min(maxHeight, openUp ? spaceAbove : spaceBelow));
  const position: ViewStyle = openUp ? { bottom: layerH - top + GAP } : { top: top + anchor.height + GAP };

  const shadow: ViewStyle =
    scheme === 'light'
      ? { shadowColor: '#121A2B', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }
      : { shadowColor: '#000000', shadowOpacity: 0.7, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 };

  // Not statusBarTranslucent on Android: the modal window then starts where the app content starts,
  // so measureInWindow coordinates line up (a translucent modal is offset by the status bar).
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent={Platform.OS !== 'android'} onRequestClose={onClose}>
      <View
        ref={layerRef}
        collapsable={false}
        style={StyleSheet.absoluteFill}
        onLayout={() => layerRef.current?.measureInWindow((x, y, width, height) => setLayer({ x, y, width, height }))}
      >
        <Pressable accessibilityLabel="Close menu" onPress={onClose} style={StyleSheet.absoluteFill} />
        {ready ? (
          <Animated.View
            entering={FadeIn.duration(120)}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel}
            style={[{ position: 'absolute', left, width: anchor.width, maxHeight: panelMax }, position, shadow]}
            className={cn('overflow-hidden rounded-lg border bg-surface-2 p-1.5', scheme === 'dark' ? 'border-border-strong' : 'border-border')}
          >
            {header ? <View className="p-1.5 pb-2">{header}</View> : null}
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            {footer ? <View className="mt-1.5 border-t border-border px-1.5 pt-2">{footer}</View> : null}
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

export type MenuItemProps = {
  label: string;
  description?: string;
  icon?: IconComponent;
  selected?: boolean;
  /** check = single select, checkbox = multi select, none = action. */
  control?: 'check' | 'checkbox' | 'none';
  destructive?: boolean;
  onPress: () => void;
};

/** A row inside a Dropdown. 44 dp min, rounded 10, selected row tinted. */
export function MenuItem({ label, description, icon, selected, control = 'check', destructive, onPress }: MenuItemProps) {
  const tinted = selected && control === 'check';
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={1}
      haptic="selection"
      accessibilityRole={control === 'checkbox' ? 'checkbox' : 'menuitem'}
      accessibilityState={{ selected: !!selected, checked: control === 'checkbox' ? !!selected : undefined }}
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <View className={cn('min-h-11 flex-row items-center gap-3 rounded-[10px] px-3 py-2', tinted ? 'bg-primary-subtle' : pressed && 'bg-border/60')}>
          {control === 'checkbox' ? <Checkbox checked={!!selected} decorative /> : null}
          {icon ? <Icon icon={icon} size={20} tone={destructive ? 'error' : tinted ? 'primary' : 'secondary'} /> : null}
          <View className="flex-1">
            <Text variant="body" tone={destructive ? 'error' : tinted ? 'primary' : 'default'} className={cn(tinted && 'font-sans-semibold')} numberOfLines={1}>
              {label}
            </Text>
            {description ? (
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>
          {tinted ? <Icon icon={IconCheck} size={18} tone="primary" strokeWidth={2.5} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

/** Shown when a dropdown search matches nothing. */
export function MenuEmpty({ label = 'No matches' }: { label?: string }) {
  return (
    <View className="items-center px-3 py-5">
      <Text variant="body-sm" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}
