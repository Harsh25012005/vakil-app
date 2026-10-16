import type { ComponentType } from 'react';
import { iconStroke, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/** Shape of any @tabler/icons-react-native glyph. */
export type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export type IconProps = {
  icon: IconComponent;
  /** 16 inline, 20 inputs/chips, 24 default/tab bar, 32 empty-state badges. */
  size?: number;
  tone?: Tone;
  /** Escape hatch for text on gradients; prefer `tone`. */
  color?: string;
  strokeWidth?: number;
};

export function Icon({ icon: Glyph, size = 24, tone = 'default', color, strokeWidth = iconStroke }: IconProps) {
  const { toneColor } = useTheme();
  return <Glyph size={size} color={color ?? toneColor(tone)} strokeWidth={strokeWidth} />;
}
