// =====================================================
// SurveyApp Theme — Colors
// Light + Dark mode palettes
// =====================================================

export const palette = {
  // Brand Greens
  greenDeep: '#0F3D2E',
  greenDark: '#1B5E42',
  greenMid: '#2D8653',
  greenVibrant: '#34A85A',
  greenLight: '#EAF3EE',
  greenMuted: '#C8E6D4',
  greenAccent: '#4CAF7D',

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F8FAF9',
  gray50: '#F4F6F5',
  gray100: '#E8EDEA',
  gray200: '#D0D9D4',
  gray300: '#A8B8B0',
  gray400: '#7A9088',
  gray500: '#5A706A',
  gray600: '#3D514B',
  gray700: '#2A3B36',
  gray800: '#1A2622',
  gray900: '#0E1A16',

  // Status
  amber: '#D4A017',
  amberLight: '#FFF3CD',
  red: '#D32F2F',
  redLight: '#FFEBEE',
  blue: '#1565C0',
  blueLight: '#E3F2FD',

  // Dark mode backgrounds
  darkBg: '#0A1F15',
  darkSurface: '#132D20',
  darkCard: '#1C3D2A',
  darkBorder: '#2A4F38',
} as const;

export const colors = {
  light: {
    // Backgrounds
    background: palette.greenLight,
    surface: palette.white,
    card: palette.white,
    sidebar: palette.greenDeep,

    // Text
    textPrimary: palette.gray800,
    textSecondary: palette.gray500,
    textInverse: palette.white,
    textOnPrimary: palette.white,
    textOnDark: palette.greenLight,

    // Brand
    primary: palette.greenDeep,
    primaryDark: palette.greenDark,
    primaryMid: palette.greenMid,
    accent: palette.greenVibrant,
    accentLight: palette.greenMuted,

    // UI
    border: palette.gray100,
    borderFocus: palette.greenMid,
    inputBg: palette.gray50,
    divider: palette.gray100,
    shadow: 'rgba(15, 61, 46, 0.08)',

    // Status
    statusActive: palette.greenVibrant,
    statusActiveText: palette.white,
    statusDraft: palette.amber,
    statusDraftText: palette.white,
    statusClosed: palette.gray400,
    statusClosedText: palette.white,
    statusArchived: palette.gray300,
    statusArchivedText: palette.gray600,

    // Charts
    chartPrimary: palette.greenMid,
    chartSecondary: palette.greenAccent,
    chartTertiary: palette.amber,
    chartQuaternary: palette.blue,
    chartColors: [
      palette.greenMid,
      palette.greenAccent,
      palette.amber,
      palette.blue,
      palette.greenDark,
    ],

    // Feedback
    success: palette.greenVibrant,
    successLight: palette.greenLight,
    error: palette.red,
    errorLight: palette.redLight,
    warning: palette.amber,
    warningLight: palette.amberLight,
    info: palette.blue,
    infoLight: palette.blueLight,

    // Tab bar
    tabBarBg: palette.white,
    tabBarActive: palette.greenMid,
    tabBarInactive: palette.gray300,
  },
  dark: {
    // Backgrounds
    background: palette.darkBg,
    surface: palette.darkSurface,
    card: palette.darkCard,
    sidebar: '#060F0B',

    // Text
    textPrimary: palette.greenLight,
    textSecondary: palette.gray300,
    textInverse: palette.gray800,
    textOnPrimary: palette.white,
    textOnDark: palette.greenLight,

    // Brand
    primary: palette.greenAccent,
    primaryDark: palette.greenMid,
    primaryMid: palette.greenAccent,
    accent: palette.greenVibrant,
    accentLight: palette.greenDark,

    // UI
    border: palette.darkBorder,
    borderFocus: palette.greenAccent,
    inputBg: palette.darkCard,
    divider: palette.darkBorder,
    shadow: 'rgba(0, 0, 0, 0.3)',

    // Status
    statusActive: palette.greenVibrant,
    statusActiveText: palette.white,
    statusDraft: palette.amber,
    statusDraftText: palette.white,
    statusClosed: palette.gray500,
    statusClosedText: palette.white,
    statusArchived: palette.gray600,
    statusArchivedText: palette.gray300,

    // Charts
    chartPrimary: palette.greenAccent,
    chartSecondary: palette.greenVibrant,
    chartTertiary: palette.amber,
    chartQuaternary: '#64B5F6',
    chartColors: [
      palette.greenAccent,
      palette.greenVibrant,
      palette.amber,
      '#64B5F6',
      palette.greenMid,
    ],

    // Feedback
    success: palette.greenAccent,
    successLight: palette.darkCard,
    error: '#EF5350',
    errorLight: '#1A0A0A',
    warning: '#FFB300',
    warningLight: '#1A1200',
    info: '#42A5F5',
    infoLight: '#0A1520',

    // Tab bar
    tabBarBg: palette.darkSurface,
    tabBarActive: palette.greenAccent,
    tabBarInactive: palette.gray600,
  },
} as const;

export type ColorScheme = typeof colors.light;
export type ThemeMode = 'light' | 'dark';
