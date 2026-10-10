import Constants from 'expo-constants';
import { useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { getApiHealth } from '../services/healthService';
import { Screen } from '../components/Screen';
import { getEnvironment } from '../config/environment';
import { theme } from '../theme';

export function AboutScreen() {
  const environment = getEnvironment();
  const { client } = useAuth();
  const [diagnostic, setDiagnostic] = useState('');
  const [busy, setBusy] = useState(false);
  async function inspect() {
    if (busy) return;
    setBusy(true);
    try {
      const [camera, library, location, api] = await Promise.all([
        ImagePicker.getCameraPermissionsAsync(), ImagePicker.getMediaLibraryPermissionsAsync(),
        Location.getForegroundPermissionsAsync(), getApiHealth(undefined, client).then(() => 'conectada', () => 'indisponível'),
      ]);
      setDiagnostic(`Sistema: ${Platform.OS} ${Platform.Version}\nAPI: ${api}\nCâmera: ${camera.status}\nGaleria: ${library.status}\nLocalização: ${location.status}`);
    } catch { setDiagnostic('Não foi possível verificar as permissões deste aparelho.'); }
    finally { setBusy(false); }
  }
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>Reporta Cotia</Text>
      <Text style={styles.body}>Participação cidadã e acompanhamento de problemas urbanos de Cotia.</Text>
      <Text style={styles.body}>Versão {Constants.expoConfig?.version ?? '0.1.0'}</Text>
      {environment.appEnv !== 'production' && <>
        <Text style={styles.body}>Ambiente: {environment.appEnv}</Text>
        <Text selectable style={styles.body}>API: {environment.apiBaseUrl}</Text>
        <Button title="Verificar conexão e permissões" loading={busy} onPress={() => void inspect()} />
        {!!diagnostic && <Text selectable accessibilityLiveRegion="polite" style={styles.body}>{diagnostic}</Text>}
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.title, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.muted },
});
