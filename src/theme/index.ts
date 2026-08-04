import { useContext, createContext } from 'react';
import { colors, ThemeMode } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, shadow } from './spacing';

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadow,
} as const;

// Flexible color scheme type — works with both light and dark
export type ColorScheme = typeof colors.light | typeof colors.dark;

export type Theme = {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadow: typeof shadow;
  mode: ThemeMode;
  c: ColorScheme;
};

export const ThemeContext = createContext<Theme>({
  ...theme,
  mode: 'light',
  c: colors.light,
});

export const useTheme = () => useContext(ThemeContext);

export { colors, ThemeMode } from './colors';
export { typography } from './typography';
export { spacing, borderRadius, shadow } from './spacing';
