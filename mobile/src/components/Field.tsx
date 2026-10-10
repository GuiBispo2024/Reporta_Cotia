import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../theme';
import { useContext } from 'react';
import { SessionActivityContext } from '../context/SessionActivityContext';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const markActivity = useContext(SessionActivityContext);
  return <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={theme.colors.muted}
      style={[styles.input, props.multiline && styles.multiline]} {...props} onChangeText={(value) => { markActivity(); props.onChangeText?.(value); }} />
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 8 }, label: { ...theme.typography.button, color: theme.colors.text },
  input: { ...theme.typography.body, color: theme.colors.text, backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
