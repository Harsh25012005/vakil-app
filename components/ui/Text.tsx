import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/utils/cn';
import type { Tone } from '@/constants/theme';
import { toneText } from '@/components/ui/tone';

/** FRS 3.1 type scale. Weight is baked into each variant via the font family. */
const variants = {
  display: 'text-display font-sans-extrabold',
  h1: 'text-h1 font-sans-bold',
  h2: 'text-h2 font-sans-bold',
  h3: 'text-h3 font-sans-semibold',
  title: 'text-title font-sans-semibold',
  'body-lg': 'text-body-lg font-sans',
  body: 'text-body font-sans',
  'body-sm': 'text-body-sm font-sans-medium',
  caption: 'text-caption font-sans-medium',
  overline: 'text-overline font-sans-bold uppercase',
  button: 'text-button font-sans-semibold',
  stat: 'text-stat font-sans-extrabold',
} as const;

export type TextVariant = keyof typeof variants;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: Tone;
  /** Dates, case numbers, amounts (FRS 3.1). Stat is always tabular. */
  tabular?: boolean;
  className?: string;
};

export function Text({ variant = 'body', tone = 'default', tabular, className, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.3}
      className={cn(variants[variant], toneText[tone], className)}
      style={[(tabular || variant === 'stat') && { fontVariant: ['tabular-nums'] }, style]}
      {...rest}
    />
  );
}
