import { IconAlertTriangle, IconInfoCircle, IconQuestionMark } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import type { IconComponent } from '@/components/ui/Icon';
import { IconBadge } from '@/components/ui/IconBadge';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { cn } from '@/utils/cn';
import { elevation } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  variant?: 'confirm' | 'destructive' | 'info';
  title: string;
  message?: string;
  icon?: IconComponent;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  /** Destructive: user must type this (case no. or "DELETE") to enable confirm (FR-CASE-15). */
  confirmText?: string;
  loading?: boolean;
  /** inline = side-by-side, stacked = full-width (long labels). */
  layout?: 'inline' | 'stacked';
};

const defaults = {
  confirm: { icon: IconQuestionMark, tone: 'primary' },
  destructive: { icon: IconAlertTriangle, tone: 'error' },
  info: { icon: IconInfoCircle, tone: 'info' },
} as const;

/** CMP-53. rounded-2xl (28), max width 340, surface-2, scrim. */
export function Dialog({
  open,
  onClose,
  variant = 'confirm',
  title,
  message,
  icon,
  confirmLabel = variant === 'destructive' ? 'Delete' : 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmText,
  loading,
  layout = 'inline',
}: DialogProps) {
  const { colors, scheme } = useTheme();
  const [typed, setTyped] = useState('');
  const d = defaults[variant];
  const matches = !confirmText || typed.trim().toUpperCase() === confirmText.trim().toUpperCase();

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const confirmBtn =
    variant === 'info' ? null : (
      <Button
        label={confirmLabel}
        variant={variant === 'destructive' ? 'destructive' : 'primary'}
        size="md"
        fullWidth
        disabled={!matches}
        loading={loading}
        haptic={variant === 'destructive' ? 'warning' : undefined}
        onPress={onConfirm}
        className={cn(layout === 'inline' && 'flex-1')}
      />
    );
  const cancelBtn = (
    <Button
      label={variant === 'info' ? 'OK' : cancelLabel}
      variant={variant === 'info' ? 'primary' : layout === 'stacked' ? 'ghost' : 'outline'}
      size="md"
      fullWidth
      onPress={onClose}
      className={cn(layout === 'inline' && 'flex-1')}
    />
  );

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 items-center justify-center px-6">
        <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={elevation(4, scheme)}
          className="w-full max-w-[340px] items-center rounded-2xl border border-border bg-surface-2 p-6"
        >
          <IconBadge icon={icon ?? d.icon} tone={d.tone} size="lg" />
          <Text variant="h3" className="mt-4 text-center">
            {title}
          </Text>
          {message ? (
            <Text variant="body" tone="secondary" className="mt-2 text-center">
              {message}
            </Text>
          ) : null}
          {confirmText ? (
            <TextField
              containerClassName="mt-5 w-full"
              label={`Type ${confirmText} to confirm`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={confirmText}
            />
          ) : null}
          <View className={cn('mt-6 w-full', layout === 'inline' ? 'flex-row gap-3' : 'gap-2')}>
            {layout === 'inline' ? (
              <>
                {variant !== 'info' ? cancelBtn : null}
                {confirmBtn ?? cancelBtn}
              </>
            ) : (
              <>
                {confirmBtn}
                {cancelBtn}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
