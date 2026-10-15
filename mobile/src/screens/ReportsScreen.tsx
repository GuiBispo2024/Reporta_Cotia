import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
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
import { Hero } from '../components/Hero';
import { Surface } from '../components/Surface';
import { ReportCard } from '../components/ReportCard';
import { Icon } from '../components/Icon';

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
        <Hero title={isMine ? 'Minhas denúncias' : user ? `Olá, ${user.username}!` : 'Ajude a melhorar Cotia.'} icon={isMine ? 'clipboard2-check' : 'geo-alt-fill'}
          description={isMine ? 'Acompanhe também registros pendentes e rejeitados.' : 'Registre problemas urbanos e acompanhe as mudanças no seu bairro.'}>
        {!!notice && <Text accessibilityRole="alert" style={[styles.body, { color: theme.colors.onDarkMuted }]}>{notice}</Text>}
        {user ? <>
          <Button title="Nova denúncia" icon="plus-lg" variant="accent" disabled={!user.permissions.includes('denuncia.create')} onPress={() => navigation.navigate('CreateReport')} />
        </> : <>
          <Button title="Entrar para publicar" icon="plus-lg" variant="accent" onPress={() => navigation.navigate('Login')} />
          <Button title="Criar conta" icon="person" onPress={() => navigation.navigate('Register')} />
        </>}
        </Hero>
        <Surface>
        <Text style={styles.heading}>Encontre uma denúncia</Text>
        <Field label="Buscar pelo título" icon="search" placeholder="Ex.: buraco na avenida" value={search} onChangeText={setSearch} maxLength={120} returnKeyType="search"
          onSubmitEditing={apply} />
        <Button title={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'} icon="sliders" onPress={() => setShowFilters((value) => !value)} />
        {showFilters && <>
          <Choices label="Categoria" value={filters.categoria ?? ''} options={[{ value: '', label: 'Todas' }, ...categories.map((value) => ({ value, label: value }))]} onChange={(categoria) => setFilters((current) => ({ ...current, categoria: categoria || undefined }))} />
          <Choices label="Situação" value={filters.resolucaoStatus ?? ''} options={[{ value: '', label: 'Todas' }, ...Object.entries(resolutionLabels).map(([value, label]) => ({ value, label }))]} onChange={(resolucaoStatus) => setFilters((current) => ({ ...current, resolucaoStatus: resolucaoStatus || undefined }))} />
          <Choices label="Ordenação" value={filters.sort ?? 'newest'} options={[{ value: 'newest', label: 'Mais recentes' }, { value: 'oldest', label: 'Mais antigas' }, ...(!isMine ? [{ value: 'likes', label: 'Mais curtidas' }, { value: 'shares', label: 'Mais compartilhadas' }] : [])]} onChange={(sort) => setFilters((current) => ({ ...current, sort: sort as ReportFilters['sort'] }))} />
          <Button title="Limpar filtros e busca" onPress={() => { setFilters({}); setApplied({}); setSearch(''); setQuery(''); setPage(1); retry(); }} />
        </>}
        <Button title="Buscar" icon="search" variant="primary" loading={busy} onPress={apply} />
        </Surface>
        <Text accessibilityRole="header" style={styles.heading}>{isMine ? 'Seus registros' : 'Denúncias publicadas'}</Text>
        {result && <Text style={styles.body}>{result.total} denúncias encontradas</Text>}
      </View>}
      ListEmptyComponent={busy ? <ActivityIndicator accessibilityLabel="Carregando denúncias" color={theme.colors.primary} />
        : error ? <Surface><Icon name="exclamation-triangle" color={theme.colors.danger} size={28} /><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button title="Tentar novamente" icon="arrow-clockwise" onPress={retry} /></Surface>
          : <Surface><Icon name="search" size={28} /><Text style={styles.body}>{isMine ? 'Você ainda não tem denúncias para esta busca.' : 'Nenhuma denúncia encontrada. Denúncias pendentes só aparecem aqui após aprovação.'}</Text></Surface>}
      renderItem={({ item }) => <ReportCard report={item} apiBaseUrl={client.defaults?.baseURL ?? ''} onPress={() => navigation.navigate('ReportDetail', { id: item.id })} />}
      ListFooterComponent={<View style={styles.footer}>
        {!!result?.data.length && <>
          <Text style={styles.body}>Página {result.page} de {Math.max(1, result.totalPages)}</Text>
          <Button title="Página anterior" icon="arrow-left" disabled={busy || page <= 1} onPress={() => setPage((value) => value - 1)} />
          <Button title="Próxima página" icon="arrow-right" disabled={busy || page >= result.totalPages} onPress={() => setPage((value) => value + 1)} />
        </>}
        <Button title="Sobre o aplicativo" icon="info-circle" variant="ghost" onPress={() => navigation.navigate('About')} />
      </View>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 18, paddingBottom: 32, flexGrow: 1, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { gap: 16, marginBottom: 24 }, footer: { gap: 16, marginTop: 24 },
  heading: { ...theme.typography.heading, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.muted }, error: { ...theme.typography.body, color: theme.colors.danger },
});
