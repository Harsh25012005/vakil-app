/**
 * Regenerates global.css from constants/theme.ts so web CSS variables can never drift from
 * the values native gets through ThemeProvider. Run: npm run theme:css
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { themeVars, type ColorScheme } from '../constants/theme';

const block = (selector: string, scheme: ColorScheme) =>
  `${selector} {\n${Object.entries(themeVars(scheme))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')}\n}`;

const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

/*
 * GENERATED from constants/theme.ts by scripts/gen-theme-css.ts. Do not edit by hand:
 * change the tokens, then run \`npm run theme:css\`.
 * Native receives these via vars() in ThemeProvider; this file covers web, including
 * portals rendered outside the app root (RN Modal on web).
 */

${block(':root', 'light')}

${block('.dark', 'dark')}
`;

writeFileSync(resolve(__dirname, '../global.css'), css);
console.log('global.css regenerated');
