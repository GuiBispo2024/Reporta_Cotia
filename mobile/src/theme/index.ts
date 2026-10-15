import { DefaultTheme, type Theme } from '@react-navigation/native';

export const theme = {
  colors: {
    primary: '#176b4d', primaryDark: '#0f4f39', accent: '#e6b84a',
    background: '#f4f7f5', surface: '#ffffff', text: '#183028',
    muted: '#52685d', border: '#dbe5df', danger: '#a12727', onPrimary: '#ffffff',
    tint: '#edf7f1', tintBorder: '#c9e4d5', onDarkMuted: '#d6e9df', warning: '#815c08', warningTint: '#fff4d9',
    info: '#23628d', infoTint: '#eaf3fb', dangerTint: '#fff1f2',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 10, md: 18, lg: 24 },
  shadow: { shadowColor: '#183028', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  typography: {
    title: { fontSize: 28, lineHeight: 36, fontWeight: '700' as const },
    heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 14, lineHeight: 20 },
    button: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  },
} as const;

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary, background: theme.colors.background,
    card: theme.colors.surface, text: theme.colors.text,
    border: theme.colors.border, notification: theme.colors.danger,
  },
};
