import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import type { RootStackParamList } from '../navigation/types';
import { getApiHealth } from '../services/healthService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';

type State = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void getApiHealth(controller.signal).then(
      () => { if (!controller.signal.aborted) setState({ status: 'ready' }); },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: toApiError(error).message });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>Uma cidade melhor começa com a sua voz.</Text>
      <Text style={styles.body}>Participe do cuidado com Cotia. Este é o início da experiência mobile do Reporta Cotia.</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Conexão com o Reporta Cotia</Text>
        <Text accessibilityLiveRegion="polite" style={[styles.body, state.status === 'error' && styles.error]}>
          {state.status === 'loading' ? 'Verificando disponibilidade…'
            : state.status === 'ready' ? 'Tudo pronto. O serviço está disponível.' : state.message}
        </Text>
        <Button title={state.status === 'error' ? 'Tentar novamente' : 'Verificar conexão'}
          loading={state.status === 'loading'} onPress={() => setAttempt((value) => value + 1)} />
      </View>
      <Button title="Sobre o aplicativo" onPress={() => navigation.navigate('About')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.title, color: theme.colors.text },
  heading: { ...theme.typography.heading, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.muted },
  error: { color: theme.colors.danger },
  card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.md },
});
