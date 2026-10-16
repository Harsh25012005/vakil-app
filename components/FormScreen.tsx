import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';

type Props = {
  title?: string;
  subtitle?: string;
  /** Small label above the title, e.g. "Step 2 of 4". */
  eyebrow?: string;
  onBack?: () => void;
  /** Trailing app-bar actions (Skip, Save...). */
  headerRight?: ReactNode;
  /** Sticky bottom area: primary action(s). Sits above the keyboard and the home indicator. */
  footer?: ReactNode;
  /** Modal screens skip the top safe-area padding the app bar adds. */
  modal?: boolean;
  /** Renders children without ScrollView padding, for screens that bring their own list. */
  bare?: boolean;
  contentClassName?: string;
  /** Lift the content above the keyboard. Off for sign-in and profile setup, where the keyboard simply scrolls over the form. */
  avoidKeyboard?: boolean;
  children: ReactNode;
};

/**
 * The shared shell for every form-like screen: back button, big title, scrolling body, and a sticky
 * footer that rides above the keyboard. Taps outside inputs never dismiss a half-filled form
 * (keyboardShouldPersistTaps = handled).
 */
export function FormScreen({ title, subtitle, eyebrow, onBack, headerRight, footer, modal, bare, contentClassName, avoidKeyboard = true, children }: Props) {
  const Wrap = avoidKeyboard ? KeyboardAvoidingView : View;
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-bg">
      <Wrap {...(avoidKeyboard ? { behavior: 'padding' as const } : {})} className="flex-1">
        <TopAppBar title="" onBack={onBack} actions={headerRight} variant="compact" />
        {bare ? (
          <View className="flex-1">{children}</View>
        ) : (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerClassName={cn('px-5 pb-8', contentClassName)}
          >
            {eyebrow ? (
              <Text variant="overline" tone="primary" className="mb-2">
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Text variant="h1" accessibilityRole="header">
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="body-lg" tone="secondary" className="mt-2">
                {subtitle}
              </Text>
            ) : null}
            <View className={cn(title || subtitle ? 'mt-8' : '', 'gap-5')}>{children}</View>
          </ScrollView>
        )}
        {footer ? (
          <View className="gap-3 border-t border-border bg-bg px-5 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            {footer}
          </View>
        ) : null}
      </Wrap>
    </View>
  );
}
