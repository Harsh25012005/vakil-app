import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, motion } from '@/constants/theme';
import { haptic } from '@/utils/haptics';
import { useTheme } from '@/hooks/useTheme';
import { Banner } from '@/components/ui/Banner';

type ToastType = 'success' | 'error' | 'info';

export type ToastOptions = {
  type?: ToastType;
  message: string;
  title?: string;
  /** e.g. "Undo" (auto-dismiss becomes 5 s) or "Retry". */
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastState = ToastOptions & { id: number };

const ToastContext = createContext<{ show: (t: ToastOptions) => void; hide: () => void } | null>(null);

/**
 * CMP-48. Slides in from the top, one at a time, styled exactly like the inline Banner (status
 * tint, icon, message, action, dismiss). 4 s, or 5 s when it carries an action.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (t: ToastOptions) => {
      clearTimeout(timer.current);
      const type = t.type ?? 'info';
      if (type === 'success') haptic.success();
      if (type === 'error') haptic.warning();
      AccessibilityInfo.announceForAccessibility(t.message);
      setToast({ ...t, type, id: Date.now() });
      timer.current = setTimeout(hide, t.duration ?? (t.actionLabel ? motion.undo : motion.toast));
    },
    [hide],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp.duration(motion.base)}
          exiting={FadeOutUp.duration(150)}
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 20, right: 20, top: insets.top + 8 }}
        >
          <Banner
            tone={toast.type ?? 'info'}
            title={toast.title}
            message={toast.message}
            actionLabel={toast.actionLabel}
            onAction={() => {
              toast.onAction?.();
              hide();
            }}
            onDismiss={hide}
            style={elevation(2, scheme)}
          />
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
