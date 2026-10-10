import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { getEnvironment } from '../config/environment';
import { theme } from '../theme';

export function AboutScreen() {
  const environment = getEnvironment();
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>Reporta Cotia</Text>
      <Text style={styles.body}>Participação cidadã e acompanhamento de problemas urbanos de Cotia.</Text>
      <Text style={styles.body}>Versão {Constants.expoConfig?.version ?? '0.1.0'}</Text>
      {environment.appEnv !== 'production' && <>
        <Text style={styles.body}>Ambiente: {environment.appEnv}</Text>
        <Text selectable style={styles.body}>API: {environment.apiBaseUrl}</Text>
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.title, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.muted },
});
