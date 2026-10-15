import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../theme';
import { useContext, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { SessionActivityContext } from '../context/SessionActivityContext';

export function Field({ label, icon, ...props }: TextInputProps & { label: string; icon?: IconName }) {
  const markActivity = useContext(SessionActivityContext);
  const [focused, setFocused] = useState(false);
  return <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.control, focused && { borderColor: theme.colors.primary }]}>
      {icon && <Icon name={icon} size={19} />}
      <TextInput accessibilityLabel={label} placeholderTextColor={theme.colors.muted} {...props}
        style={[styles.input, props.multiline && styles.multiline, props.style]} onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        onChangeText={(value) => { markActivity(); props.onChangeText?.(value); }} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 8 }, label: { ...theme.typography.button, color: theme.colors.text },
  control: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.sm },
  input: { ...theme.typography.body, color: theme.colors.text, flex: 1, minWidth: 0, paddingVertical: 12, minHeight: 48 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
