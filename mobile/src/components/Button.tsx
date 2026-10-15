import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';
import { Icon, type IconName } from './Icon';

type Props = { title: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: IconName; variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' };

export function Button({ title, onPress, loading = false, disabled = false, icon, variant = 'secondary' }: Props) {
  const filled = variant === 'primary';
  const color = filled ? theme.colors.onPrimary : variant === 'danger' ? theme.colors.danger : theme.colors.primaryDark;
  const backgroundColor = filled ? theme.colors.primary : variant === 'accent' ? theme.colors.accent : variant === 'danger' ? theme.colors.dangerTint : variant === 'ghost' ? 'transparent' : theme.colors.tint;
  const borderColor = variant === 'secondary' ? theme.colors.tintBorder : variant === 'danger' ? '#efc2c7' : 'transparent';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor, borderColor }, (pressed || disabled || loading) && styles.inactive]}>
      {loading ? <ActivityIndicator color={color} /> : icon ? <Icon name={icon} color={color} size={19} /> : null}
      <Text style={[styles.text, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, borderRadius: theme.radius.sm, padding: theme.spacing.md,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: theme.spacing.sm,
  },
  inactive: { opacity: 0.65 },
  text: { ...theme.typography.button, color: theme.colors.onPrimary, textAlign: 'center', flexShrink: 1 },
});
