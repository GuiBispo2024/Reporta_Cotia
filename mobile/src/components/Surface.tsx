import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { theme } from '../theme';
export function Surface({ children }: PropsWithChildren) {
  return <View style={{ padding: 18, gap: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, ...theme.shadow }}>{children}</View>;
}
