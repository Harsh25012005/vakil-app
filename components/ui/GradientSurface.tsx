import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { gradients, type GradientName } from '@/constants/theme';

type Props = {
  variant?: GradientName;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** FRS 2.6 / 10. Text on gradients is always #FFFFFF. One gradient element per screen. */
export function GradientSurface({ variant = 'primary', className, style, children }: Props) {
  const g = gradients[variant];
  return (
    <LinearGradient colors={g.colors} start={g.start} end={g.end} className={className} style={style}>
      {children}
    </LinearGradient>
  );
}
