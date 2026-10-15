import { Pressable, Text, View } from 'react-native';
import { theme } from '../theme';
export function Choices({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void; disabled?: boolean;
}) {
  return <View style={{ gap: 8 }}><Text style={theme.typography.heading}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map((option) => <Pressable key={option.value}
      accessibilityRole="radio" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{ selected: value === option.value, disabled }}
      disabled={disabled} onPress={() => onChange(option.value)} style={{ minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: value === option.value ? theme.colors.primary : theme.colors.surface }}>
      <Text style={{ color: value === option.value ? theme.colors.onPrimary : theme.colors.text }}>{option.label}</Text>
    </Pressable>)}</View>
  </View>;
}
