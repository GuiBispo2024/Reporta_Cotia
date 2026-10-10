import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { listReports, type ReportPage } from '../services/reportService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';

export const resolutionLabels: Record<string, string> = { aberta: 'Aberta', em_andamento: 'Em andamento', resolvida: 'Resolvida' };
export function ReportsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Reports'>) {
  const { client, user, notice, signOut } = useAuth();
  const [result, setResult] = useState<ReportPage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [leaving, setLeaving] = useState(false);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setBusy(true); setError(''); setResult(null);
    void listReports(client, page, query, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult(data); },
      (reason: unknown) => { if (!controller.signal.aborted) setError(toApiError(reason).message); },
    ).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [client, page, query, attempt]));
  const retry = () => setAttempt((value) => value + 1);
  async function leave() {
    setLeaving(true); setAccountError('');
    try { await signOut(); } catch (reason) { setAccountError(toApiError(reason).message); }
    finally { setLeaving(false); }
  }
  return <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
    <FlatList data={result?.data ?? []} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      refreshing={busy} onRefresh={retry}
      ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Cotia, com a sua voz</Text>
        <Text style={styles.body}>Acompanhe as denúncias da cidade e ajude a cuidar do seu bairro.</Text>
        {!!notice && <Text accessibilityRole="alert" style={styles.body}>{notice}</Text>}
        {user ? <>
          <Text style={styles.body}>Olá, {user.username}</Text>
          <Button title="Nova denúncia" disabled={!user.permissions.includes('denuncia.create')} onPress={() => navigation.navigate('CreateReport')} />
          <Button title="Sair da conta" loading={leaving} onPress={() => void leave()} />
        </> : <>
          <Button title="Entrar para publicar" onPress={() => navigation.navigate('Login')} />
          <Button title="Criar conta" onPress={() => navigation.navigate('Register')} />
        </>}
        {!!accountError && <Text accessibilityRole="alert" style={styles.error}>{accountError}</Text>}
        <Field label="Buscar pelo título" value={search} onChangeText={setSearch} maxLength={120} returnKeyType="search"
          onSubmitEditing={() => { setPage(1); setQuery(search); retry(); }} />
        <Button title="Buscar" loading={busy} onPress={() => { setPage(1); setQuery(search); retry(); }} />
        <Text accessibilityRole="header" style={styles.heading}>Denúncias publicadas</Text>
        {result && <Text style={styles.body}>{result.total} denúncias encontradas</Text>}
      </View>}
      ListEmptyComponent={busy ? <ActivityIndicator accessibilityLabel="Carregando denúncias" color={theme.colors.primary} />
        : error ? <View style={styles.header}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Tentar novamente" onPress={retry} /></View>
          : <Text style={styles.body}>Nenhuma denúncia encontrada. Denúncias pendentes só aparecem aqui após aprovação.</Text>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver denúncia: ${item.titulo}`}
        onPress={() => navigation.navigate('ReportDetail', { id: item.id })} style={styles.card}>
        <Text style={styles.tag}>{item.categoria} · {resolutionLabels[item.resolucaoStatus] ?? item.resolucaoStatus}</Text>
        <Text style={styles.heading}>{item.titulo}</Text>
        <Text numberOfLines={3} style={styles.body}>{item.descricao}</Text>
        <Text style={styles.body}>{item.localizacao}{item.bairro ? ` · ${item.bairro}` : ''}</Text>
        <Text style={styles.tag}>Ver detalhes →</Text>
      </Pressable>}
      ListFooterComponent={<View style={styles.footer}>
        {!!result?.data.length && <>
          <Text style={styles.body}>Página {result.page} de {Math.max(1, result.totalPages)}</Text>
          <Button title="Página anterior" disabled={busy || page <= 1} onPress={() => setPage((value) => value - 1)} />
          <Button title="Próxima página" disabled={busy || page >= result.totalPages} onPress={() => setPage((value) => value + 1)} />
        </>}
        <Button title="Sobre o aplicativo" onPress={() => navigation.navigate('About')} />
      </View>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, flexGrow: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { gap: 16, marginBottom: 24 }, footer: { gap: 16, marginTop: 24 },
  title: { ...theme.typography.title, color: theme.colors.text }, heading: { ...theme.typography.heading, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.muted }, error: { ...theme.typography.body, color: theme.colors.danger },
  tag: { ...theme.typography.caption, color: theme.colors.primary },
  card: { backgroundColor: theme.colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, gap: 12 },
});
