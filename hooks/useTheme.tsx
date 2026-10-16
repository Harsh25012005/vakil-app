import { useColorScheme, vars } from 'nativewind';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { Theme } from '@vakil/shared';
import { semantic, status, themeVars, type ColorScheme, type FillTone, type SemanticColors, type Tone } from '@/constants/theme';

type ThemeContextValue = {
  /** User preference: dark (default), light or system. */
  mode: Theme;
  /** Resolved scheme actually rendered. */
  scheme: ColorScheme;
  colors: SemanticColors;
  setMode: (mode: Theme) => void;
  /** Apply a stored preference (e.g. from the profile) without re-saving it. */
  hydrateMode: (mode: Theme) => void;
  /** Foreground color for a tone (icons, spinners, SVG strokes). */
  toneColor: (tone: Tone) => string;
  /** Background + foreground pair for tinted containers. */
  fillColors: (tone: FillTone) => { bg: string; fg: string };
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  initialMode?: Theme;
  /** Persist the choice (device storage + PATCH /me), FR-SET-02. */
  onModeChange?: (mode: Theme) => void;
  children: ReactNode;
};

export function ThemeProvider({ initialMode = 'dark', onModeChange, children }: Props) {
  const [mode, setModeState] = useState<Theme>(initialMode);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  const scheme: ColorScheme = colorScheme === 'light' ? 'light' : 'dark';

  const hydrateMode = useCallback((next: Theme) => setModeState(next), []);

  const setMode = useCallback(
    (next: Theme) => {
      setModeState(next);
      onModeChange?.(next);
    },
    [onModeChange],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const colors = semantic[scheme];
    const toneColor = (tone: Tone): string => {
      switch (tone) {
        case 'default':
          return colors.text;
        case 'secondary':
          return colors.text2;
        case 'tertiary':
          return colors.text3;
        case 'disabled':
          return colors.textDisabled;
        case 'primary':
          return colors.primaryFg;
        case 'brand':
          return colors.primary;
        case 'on-primary':
          return colors.onPrimary;
        default:
          return status[tone][scheme].fg;
      }
    };
    const fillColors = (tone: FillTone) => {
      if (tone === 'primary') return { bg: colors.primarySubtle, fg: colors.primaryFg };
      if (tone === 'neutral') return { bg: colors.surface2, fg: colors.text2 };
      return { ...status[tone][scheme] };
    };
    return { mode, scheme, colors, setMode, hydrateMode, toneColor, fillColors };
  }, [mode, scheme, setMode]);

  // Inject the scheme's CSS variables at the root so every bg-*/text-* class resolves from
  // tokens.ts on native too (the .dark selector in global.css only reliably applies on web).
  const themeStyle = useMemo(() => vars(themeVars(scheme)), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeStyle]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
