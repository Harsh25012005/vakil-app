/**
 * Vakil.app design tokens (FRS sections 2-3).
 * Tailwind classes cover layout and color; these JS values are for places classes
 * can't reach: icon colors, gradients, shadows, SVG, animation timings.
 * Keep in sync with tailwind.config.js and global.css.
 */
import type { ViewStyle } from 'react-native';

export const palette = {
  blue: {
    50: '#EEF4FF', 100: '#DCE7FF', 200: '#BCD2FF', 300: '#8EB3FF', 400: '#5B8CFF', 500: '#3366FF',
    600: '#2350E6', 700: '#1C3FC0', 800: '#1B3699', 900: '#1B3279', 950: '#121F4A',
  },
  ink: {
    0: '#FFFFFF', 50: '#F6F8FC', 100: '#EDF1F8', 200: '#DCE3EF', 300: '#BCC7DA', 400: '#8C9AB3',
    500: '#64728C', 600: '#475570', 700: '#2E3A52', 800: '#1C2538', 900: '#121A2B', 950: '#0A101D',
  },
  white: '#FFFFFF',
} as const;

export type ColorScheme = 'dark' | 'light';

const { blue, ink } = palette;

/**
 * Dark theme neutrals: true black base (OLED friendly) with neutral, slightly cool greys.
 * Depth comes from stepping surfaces up in lightness, not from shadows.
 */
export const night = {
  0: '#000000', // bg
  50: '#0B0B0D',
  100: '#121214', // surface (cards)
  200: '#1C1C20', // surface-2 (inputs, sheets, menus)
  300: '#27272C', // border
  400: '#3A3A41', // border-strong
  500: '#56565E', // disabled text
  600: '#8E8E98', // text-3 (5.9:1 on black)
  700: '#B8B8C1', // text-2 (10:1)
  800: '#E4E4E9',
  900: '#FAFAFB', // text
} as const;

export const semantic = {
  dark: {
    bg: night[0],
    surface: night[100],
    surface2: night[200],
    border: night[300],
    borderStrong: night[400],
    text: night[900],
    text2: night[700],
    text3: night[600],
    textDisabled: night[500],
    primary: blue[500],
    primaryPressed: blue[600],
    primarySubtle: '#0E1A3A',
    primaryFg: blue[300],
    onPrimary: palette.white,
    focusRing: blue[400],
    overlay: 'rgba(0,0,0,0.72)',
  },
  light: {
    bg: ink[50],
    surface: ink[0],
    surface2: ink[100],
    border: ink[200],
    borderStrong: ink[300],
    text: ink[900],
    text2: ink[600],
    text3: ink[500],
    textDisabled: ink[300],
    primary: blue[600],
    primaryPressed: blue[700],
    primarySubtle: blue[50],
    primaryFg: blue[600],
    onPrimary: palette.white,
    focusRing: blue[200],
    overlay: 'rgba(18,26,43,0.48)',
  },
} as const;

export type SemanticColors = (typeof semantic)[ColorScheme];

export const status = {
  success: { base: '#22C55E', dark: { bg: '#0B2516', fg: '#4ADE80' }, light: { bg: '#E8F8EE', fg: '#15803D' } },
  warning: { base: '#F59E0B', dark: { bg: '#2A1E05', fg: '#FBBF24' }, light: { bg: '#FEF4E2', fg: '#B45309' } },
  error: { base: '#EF4444', dark: { bg: '#2B0E11', fg: '#F87171' }, light: { bg: '#FDECEC', fg: '#B91C1C' } },
  info: { base: '#0EA5E9', dark: { bg: '#071F2C', fg: '#38BDF8' }, light: { bg: '#E6F6FD', fg: '#0369A1' } },
  adjourned: { base: '#8B5CF6', dark: { bg: '#1C1435', fg: '#A78BFA' }, light: { bg: '#F1ECFE', fg: '#6D28D9' } },
} as const;

export type StatusName = keyof typeof status;

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/**
 * CSS variables for a scheme as "r g b" triplets. ThemeProvider injects these with NativeWind's
 * vars() at the root, so native and web resolve `bg-surface` etc. from this single source.
 * global.css mirrors them only for web portals rendered outside the root (RN Modal on web).
 */
export function themeVars(scheme: ColorScheme): Record<`--${string}`, string> {
  const c = semantic[scheme];
  const vars: Record<`--${string}`, string> = {
    '--bg': rgb(c.bg),
    '--surface': rgb(c.surface),
    '--surface-2': rgb(c.surface2),
    '--border': rgb(c.border),
    '--border-strong': rgb(c.borderStrong),
    '--text': rgb(c.text),
    '--text-2': rgb(c.text2),
    '--text-3': rgb(c.text3),
    '--text-disabled': rgb(c.textDisabled),
    '--primary': rgb(c.primary),
    '--primary-pressed': rgb(c.primaryPressed),
    '--primary-subtle': rgb(c.primarySubtle),
    '--primary-fg': rgb(c.primaryFg),
    '--focus-ring': rgb(c.focusRing),
  };
  for (const name of Object.keys(status) as StatusName[]) {
    vars[`--${name}-bg`] = rgb(status[name][scheme].bg);
    vars[`--${name}-fg`] = rgb(status[name][scheme].fg);
  }
  return vars;
}

/** Every colored element in the system resolves to one of these tones. */
export type Tone =
  | 'default'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'primary'
  | 'brand'
  | 'on-primary'
  | StatusName;

/** Tones used by tinted containers (pills, banners, icon badges). */
export type FillTone = 'primary' | 'neutral' | StatusName;

type GradientDef = {
  colors: readonly [string, string, ...string[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

const deg135 = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

/** The only gradient: fills the Primary button (FRS 2.6, trimmed to what the product uses). */
export const gradients = {
  // Deep blue to a soft sky highlight, matching the approved Primary button reference.
  primary: { colors: ['#1B56F5', '#2563FF', '#5E92FF', '#8DB0FF'], start: { x: 0.15, y: 0 }, end: { x: 0.85, y: 1 } },
} satisfies Record<string, GradientDef>;

export type GradientName = keyof typeof gradients;

/**
 * Radius scale (FRS 3.3). Nested surfaces use `inner = outer - padding`
 * so corners stay concentric (e.g. segmented pill inside a 12 dp track with 4 dp padding = 8).
 */
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 28, full: 9999 } as const;

export const spacing = { gutter: 20, cardPadding: 16, cardGap: 12, sectionGap: 32 } as const;

export const sizes = {
  control: { sm: 36, md: 44, lg: 52 },
  field: 52,
  touchTarget: 48,
  tabBar: 64,
} as const;

export const motion = {
  fast: 120,
  base: 200,
  spring: { damping: 18, stiffness: 180 },
  pressScale: 0.97,
  toast: 4000,
  undo: 5000,
} as const;

export const iconSize = { inline: 16, input: 20, default: 24, badge: 32 } as const;
export const iconStroke = 1.75;

/** FRS 3.4. Dark shows depth with surface + border; light uses blue-tinted shadows. */
const shadows: Record<ColorScheme, Record<1 | 2 | 3 | 4, ViewStyle>> = {
  light: {
    1: { shadowColor: ink[900], shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    2: { shadowColor: ink[900], shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    3: { shadowColor: blue[600], shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
    4: { shadowColor: ink[900], shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
  },
  dark: {
    1: {},
    2: {},
    3: { shadowColor: blue[500], shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    4: { shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
  },
};

export function elevation(level: 0 | 1 | 2 | 3 | 4, scheme: ColorScheme): ViewStyle {
  return level === 0 ? {} : shadows[scheme][level];
}

/** Initials avatars: color hashed from the name across 6 tints (FRS CMP-27). */
export const avatarTints: Record<ColorScheme, readonly { bg: string; fg: string }[]> = {
  dark: [
    { bg: blue[950], fg: blue[300] },
    { bg: status.adjourned.dark.bg, fg: status.adjourned.dark.fg },
    { bg: status.info.dark.bg, fg: status.info.dark.fg },
    { bg: status.success.dark.bg, fg: status.success.dark.fg },
    { bg: status.warning.dark.bg, fg: status.warning.dark.fg },
    { bg: '#2E1527', fg: '#F472B6' },
  ],
  light: [
    { bg: blue[50], fg: blue[700] },
    { bg: status.adjourned.light.bg, fg: status.adjourned.light.fg },
    { bg: status.info.light.bg, fg: status.info.light.fg },
    { bg: status.success.light.bg, fg: status.success.light.fg },
    { bg: status.warning.light.bg, fg: status.warning.light.fg },
    { bg: '#FCE7F3', fg: '#BE185D' },
  ],
};
