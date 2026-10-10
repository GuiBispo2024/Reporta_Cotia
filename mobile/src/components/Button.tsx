import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

type Props = { title: string; onPress: () => void; loading?: boolean; disabled?: boolean };

export function Button({ title, onPress, loading = false, disabled = false }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading} onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled || loading) && styles.inactive]}>
      {loading && <ActivityIndicator color={theme.colors.onPrimary} />}
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, borderRadius: theme.radius.sm, padding: theme.spacing.md,
    backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: theme.spacing.sm,
  },
  inactive: { opacity: 0.65 },
  text: { ...theme.typography.button, color: theme.colors.onPrimary, textAlign: 'center', flexShrink: 1 },
});
