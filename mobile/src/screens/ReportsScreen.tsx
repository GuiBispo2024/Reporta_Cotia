import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { categories, listReports, listMyReports, type ReportFilters, type ReportPage } from '../services/reportService';
import { Choices } from '../components/Choices';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';

export const resolutionLabels: Record<string, string> = { aberta: 'Aberta', em_andamento: 'Em andamento', resolvida: 'Resolvida' };
export function ReportsScreen({ navigation, route }: { navigation: Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'>; route: { name: 'Reports' | 'MyReports' } }) {
  const isMine = route.name === 'MyReports';
  const { client, user, notice } = useAuth();
  const [result, setResult] = useState<ReportPage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [applied, setApplied] = useState<ReportFilters>({});
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setBusy(true); setError(''); setResult(null);
    const extra = Object.keys(applied).length ? [applied] as const : [];
    const request = isMine && user ? listMyReports(client, user.id, page, query, controller.signal, ...extra) : listReports(client, page, query, controller.signal, ...extra);
    void request.then(
      (data) => { if (!controller.signal.aborted) setResult(data); },
      (reason: unknown) => { if (!controller.signal.aborted) setError(toApiError(reason).message); },
    ).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [client, page, query, applied, attempt, isMine, user]));
  const retry = () => setAttempt((value) => value + 1);
  function apply() { setPage(1); setQuery(search); setApplied(filters); retry(); }
  return <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
    <FlatList data={result?.data ?? []} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled" ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      refreshing={busy} onRefresh={retry}
      ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{isMine ? 'Minhas denúncias' : 'Cotia, com a sua voz'}</Text>
        <Text style={styles.body}>{isMine ? 'Acompanhe também registros pendentes e rejeitados.' : 'Acompanhe as denúncias da cidade e ajude a cuidar do seu bairro.'}</Text>
        {!!notice && <Text accessibilityRole="alert" style={styles.body}>{notice}</Text>}
        {user ? <>
          <Text style={styles.body}>Olá, {user.username}</Text>
          <Button title="Nova denúncia" disabled={!user.permissions.includes('denuncia.create')} onPress={() => navigation.navigate('CreateReport')} />
        </> : <>
          <Button title="Entrar para publicar" onPress={() => navigation.navigate('Login')} />
          <Button title="Criar conta" onPress={() => navigation.navigate('Register')} />
        </>}
        <Field label="Buscar pelo título" value={search} onChangeText={setSearch} maxLength={120} returnKeyType="search"
          onSubmitEditing={apply} />
        <Button title={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'} onPress={() => setShowFilters((value) => !value)} />
        {showFilters && <>
          <Choices label="Categoria" value={filters.categoria ?? ''} options={[{ value: '', label: 'Todas' }, ...categories.map((value) => ({ value, label: value }))]} onChange={(categoria) => setFilters((current) => ({ ...current, categoria: categoria || undefined }))} />
          <Choices label="Situação" value={filters.resolucaoStatus ?? ''} options={[{ value: '', label: 'Todas' }, ...Object.entries(resolutionLabels).map(([value, label]) => ({ value, label }))]} onChange={(resolucaoStatus) => setFilters((current) => ({ ...current, resolucaoStatus: resolucaoStatus || undefined }))} />
          <Choices label="Ordenação" value={filters.sort ?? 'newest'} options={[{ value: 'newest', label: 'Mais recentes' }, { value: 'oldest', label: 'Mais antigas' }, ...(!isMine ? [{ value: 'likes', label: 'Mais curtidas' }, { value: 'shares', label: 'Mais compartilhadas' }] : [])]} onChange={(sort) => setFilters((current) => ({ ...current, sort: sort as ReportFilters['sort'] }))} />
          <Button title="Limpar filtros e busca" onPress={() => { setFilters({}); setApplied({}); setSearch(''); setQuery(''); setPage(1); retry(); }} />
        </>}
        <Button title="Buscar" loading={busy} onPress={apply} />
        <Text accessibilityRole="header" style={styles.heading}>{isMine ? 'Seus registros' : 'Denúncias publicadas'}</Text>
        {result && <Text style={styles.body}>{result.total} denúncias encontradas</Text>}
      </View>}
      ListEmptyComponent={busy ? <ActivityIndicator accessibilityLabel="Carregando denúncias" color={theme.colors.primary} />
        : error ? <View style={styles.header}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Tentar novamente" onPress={retry} /></View>
          : <Text style={styles.body}>{isMine ? 'Você ainda não tem denúncias para esta busca.' : 'Nenhuma denúncia encontrada. Denúncias pendentes só aparecem aqui após aprovação.'}</Text>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Ver denúncia: ${item.titulo}`}
        onPress={() => navigation.navigate('ReportDetail', { id: item.id })} style={styles.card}>
        <Text style={styles.tag}>{item.categoria} · {resolutionLabels[item.resolucaoStatus] ?? item.resolucaoStatus}</Text>
        {isMine && <Text style={styles.tag}>{item.status === 'pendente' ? 'Aguardando moderação' : item.status === 'rejeitada' ? 'Rejeitada' : 'Aprovada'}</Text>}
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
