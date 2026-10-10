import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { categories, createReport, type ReportInput } from '../services/reportService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';

export function CreateReportScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'CreateReport'>) {
  const { client, user } = useAuth();
  const [input, setInput] = useState<ReportInput>({ titulo: '', descricao: '', localizacao: '', bairro: '', categoria: 'Outros' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);
  const submitting = useRef(false);
  const field = (name: keyof ReportInput) => (value: string) => setInput((current) => ({ ...current, [name]: value }));
  const canCreate = !!user?.permissions.includes('denuncia.create');
  async function submit() {
    if (submitting.current || !canCreate) return;
    if (![input.titulo, input.descricao, input.localizacao].every((value) => value.trim())) {
      setError('Preencha título, descrição e endereço.'); return;
    }
    submitting.current = true; setBusy(true); setError('');
    try { const report = await createReport(client, input); setReportId(report.id); }
    catch (reason) { setError(toApiError(reason).message); }
    finally { submitting.current = false; setBusy(false); }
  }
  if (reportId !== null) return <Screen>
    <Text accessibilityRole="header" style={styles.title}>Denúncia enviada</Text>
    <Text accessibilityRole="alert" style={styles.body}>Protocolo #{reportId}. Sua denúncia aguarda moderação e aparecerá na lista pública após aprovação.</Text>
    <Button title="Ver denúncia enviada" onPress={() => navigation.replace('ReportDetail', { id: reportId })} />
    <Button title="Voltar à lista" onPress={() => navigation.popToTop()} />
  </Screen>;
  return <Screen>
    <Text style={styles.title}>O que precisa de atenção?</Text>
    <Text style={styles.body}>Informe o problema e o endereço em Cotia. Sua denúncia será analisada antes da publicação.</Text>
    <Field label="Título" value={input.titulo} onChangeText={field('titulo')} maxLength={120} editable={!busy} />
    <Field label="Descrição" value={input.descricao} onChangeText={field('descricao')} maxLength={2000} multiline editable={!busy} />
    <Field label="Endereço / localização" value={input.localizacao} onChangeText={field('localizacao')} maxLength={255} editable={!busy} />
    <Field label="Bairro (opcional)" value={input.bairro} onChangeText={field('bairro')} maxLength={120} editable={!busy} />
    <Text style={styles.body}>Categoria</Text>
    <View style={styles.categories}>{categories.map((category) => <Pressable key={category} accessibilityRole="radio"
      accessibilityLabel={category} accessibilityState={{ selected: input.categoria === category, disabled: busy }}
      disabled={busy} onPress={() => field('categoria')(category)} style={[styles.category, input.categoria === category && styles.selected]}>
      <Text style={{ color: input.categoria === category ? theme.colors.onPrimary : theme.colors.text }}>{category}</Text>
    </Pressable>)}</View>
    {!canCreate && <Text accessibilityRole="alert">Sua conta não tem permissão para publicar denúncias.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title="Enviar denúncia" loading={busy} disabled={!canCreate} onPress={() => void submit()} />
  </Screen>;
}
const styles = StyleSheet.create({
  title: { ...theme.typography.title, color: theme.colors.text }, body: { ...theme.typography.body, color: theme.colors.muted },
  error: { color: theme.colors.danger }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { padding: 12, minHeight: 48, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  selected: { backgroundColor: theme.colors.primary },
});
