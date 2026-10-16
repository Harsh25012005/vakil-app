const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const status = (name, base, solid) => ({ DEFAULT: base, bg: v(`${name}-bg`), fg: v(`${name}-fg`), ...solid });

/** Mirrors constants/theme.ts. Keep both in sync. */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        border: v('border'),
        'border-strong': v('border-strong'),
        text: v('text'),
        'text-2': v('text-2'),
        'text-3': v('text-3'),
        'text-disabled': v('text-disabled'),
        'on-primary': '#FFFFFF',
        'focus-ring': v('focus-ring'),
        primary: {
          DEFAULT: v('primary'),
          pressed: v('primary-pressed'),
          subtle: v('primary-subtle'),
          fg: v('primary-fg'),
        },
        blue: {
          50: '#EEF4FF', 100: '#DCE7FF', 200: '#BCD2FF', 300: '#8EB3FF', 400: '#5B8CFF',
          500: '#3366FF', 600: '#2350E6', 700: '#1C3FC0', 800: '#1B3699', 900: '#1B3279', 950: '#121F4A',
        },
        ink: {
          0: '#FFFFFF', 50: '#F6F8FC', 100: '#EDF1F8', 200: '#DCE3EF', 300: '#BCC7DA', 400: '#8C9AB3',
          500: '#64728C', 600: '#475570', 700: '#2E3A52', 800: '#1C2538', 900: '#121A2B', 950: '#0A101D',
        },
        // solid / solid-pressed: fills behind white text (>= 4.5:1), base hues are too light for that.
        success: status('success', '#22C55E', { solid: '#15803D', 'solid-pressed': '#166534' }),
        warning: status('warning', '#F59E0B'),
        error: status('error', '#EF4444', { solid: '#DC2626', 'solid-pressed': '#B91C1C' }),
        info: status('info', '#0EA5E9'),
        adjourned: status('adjourned', '#8B5CF6'),
      },
      // Named font-sans-* (not font-medium/font-bold) so they never collide with fontWeight
      // utilities; on Android a custom family + fontWeight can fall back to the system font.
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        'sans-medium': ['PlusJakartaSans_500Medium'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold'],
        'sans-bold': ['PlusJakartaSans_700Bold'],
        'sans-extrabold': ['PlusJakartaSans_800ExtraBold'],
      },
      fontSize: {
        display: [32, { lineHeight: '40px', letterSpacing: -0.5 }],
        h1: [28, { lineHeight: '36px', letterSpacing: -0.4 }],
        h2: [24, { lineHeight: '32px', letterSpacing: -0.3 }],
        h3: [20, { lineHeight: '28px', letterSpacing: -0.2 }],
        title: [17, { lineHeight: '24px' }],
        'body-lg': [16, { lineHeight: '24px' }],
        body: [15, { lineHeight: '22px' }],
        'body-sm': [13, { lineHeight: '20px' }],
        caption: [12, { lineHeight: '16px', letterSpacing: 0.1 }],
        overline: [11, { lineHeight: '16px', letterSpacing: 0.8 }],
        button: [15, { lineHeight: '20px', letterSpacing: 0.1 }],
        stat: [28, { lineHeight: '32px', letterSpacing: -0.5 }],
      },
      borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 28 },
      spacing: { gutter: 20 },
    },
  },
};
