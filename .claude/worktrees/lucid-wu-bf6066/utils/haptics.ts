import * as Haptics from 'expo-haptics';

const run = (p: Promise<void>) => {
  p.catch(() => undefined);
};

/** FRS 3.6: light on toggle / select, success on save, warning on delete. */
export const haptic = {
  light: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  selection: () => run(Haptics.selectionAsync()),
  success: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

export type HapticKind = keyof typeof haptic;
