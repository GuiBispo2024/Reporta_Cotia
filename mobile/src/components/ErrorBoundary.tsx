import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { theme } from '../theme';

type Props = PropsWithChildren<{ onError?: (error: Error, info: ErrorInfo) => void }>;
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State { return { hasError: true }; }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (__DEV__) console.warn('[ErrorBoundary] Falha de renderização:', error.name);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text accessibilityRole="header" style={styles.title}>Não foi possível abrir esta tela</Text>
          <Text style={styles.body}>Tente novamente para voltar ao aplicativo.</Text>
          <Button title="Tentar novamente" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.lg, backgroundColor: theme.colors.background },
  title: { ...theme.typography.heading, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.muted },
});
