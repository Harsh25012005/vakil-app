import type { FillTone, Tone } from '@/constants/theme';

// Literal class maps: NativeWind compiles classes at build time, so tone classes
// must never be built with string interpolation.

export const toneText: Record<Tone, string> = {
  default: 'text-text',
  secondary: 'text-text-2',
  tertiary: 'text-text-3',
  disabled: 'text-text-disabled',
  primary: 'text-primary-fg',
  brand: 'text-primary',
  'on-primary': 'text-on-primary',
  success: 'text-success-fg',
  warning: 'text-warning-fg',
  error: 'text-error-fg',
  info: 'text-info-fg',
  adjourned: 'text-adjourned-fg',
};

export const fillBg: Record<FillTone, string> = {
  primary: 'bg-primary-subtle',
  neutral: 'bg-surface-2',
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  error: 'bg-error-bg',
  info: 'bg-info-bg',
  adjourned: 'bg-adjourned-bg',
};

export const fillText: Record<FillTone, Tone> = {
  primary: 'primary',
  neutral: 'secondary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  adjourned: 'adjourned',
};
