import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { Icon, type IconName } from './Icon';
export function Hero({ title, description, eyebrow = 'COTIA • PARTICIPAÇÃO CIDADÃ', icon = 'geo-alt-fill', children }: PropsWithChildren<{ title: string; description?: string; eyebrow?: string; icon?: IconName }>) {
  return <LinearGradient colors={[theme.colors.primaryDark, theme.colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: theme.radius.lg, padding: 22, gap: 14 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name={icon} color={theme.colors.accent} size={18} /><Text style={{ color: theme.colors.accent, fontSize: 11, letterSpacing: 1.3, fontWeight: '800', flexShrink: 1 }}>{eyebrow}</Text></View>
    <Text accessibilityRole="header" style={{ ...theme.typography.title, color: theme.colors.onPrimary, fontWeight: '800', letterSpacing: -0.5 }}>{title}</Text>
    {!!description && <Text style={{ ...theme.typography.body, color: theme.colors.onDarkMuted }}>{description}</Text>}
    {children}
  </LinearGradient>;
}
