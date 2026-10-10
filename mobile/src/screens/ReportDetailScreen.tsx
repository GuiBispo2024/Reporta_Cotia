import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { getReport, getReportHistory, type HistoryEntry, type Report } from '../services/reportService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';
import { resolutionLabels } from './ReportsScreen';
import { ReportImages } from '../components/ReportImages';

export function ReportDetailScreen({ route }: NativeStackScreenProps<RootStackParamList, 'ReportDetail'>) {
  const { client } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const labels: Record<string, string> = { ...resolutionLabels, pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };
  useEffect(() => {
    if (!report) return;
    const controller = new AbortController(); setHistory(null); setHistoryError('');
    void getReportHistory(client, route.params.id, controller.signal).then(
      (entries) => { if (!controller.signal.aborted) setHistory(entries); },
      (reason: unknown) => { if (!controller.signal.aborted) setHistoryError(toApiError(reason).message); },
    );
    return () => controller.abort();
  }, [client, route.params.id, report, historyAttempt]);
  useEffect(() => {
    const controller = new AbortController(); setError(''); setReport(null);
    void getReport(client, route.params.id, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setReport(data); },
      (reason: unknown) => { if (!controller.signal.aborted) setError(toApiError(reason).message); },
    );
    return () => controller.abort();
  }, [client, route.params.id, attempt]);
  return <Screen>{error ? <>
    <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>
    <Button title="Tentar novamente" onPress={() => setAttempt((value) => value + 1)} />
  </> : report ? <>
    <Text accessibilityRole="header" style={{ ...theme.typography.title, color: theme.colors.text }}>{report.titulo}</Text>
    <Text style={theme.typography.body}>Protocolo #{report.id} · {report.categoria}</Text>
    <Text style={theme.typography.body}>{report.status === 'pendente' ? 'Aguardando moderação' : report.status === 'rejeitada' ? 'Rejeitada na moderação' : resolutionLabels[report.resolucaoStatus] ?? report.resolucaoStatus}</Text>
    <Text style={theme.typography.body}>Setor responsável: {report.setorResponsavel || 'Ainda não definido'}</Text>
    {!!report.motivoRejeicao && <Text accessibilityRole="alert" style={{ ...theme.typography.body, color: theme.colors.danger }}>Motivo da rejeição: {report.motivoRejeicao}</Text>}
    <Text selectable style={theme.typography.body}>{report.descricao}</Text>
    <ReportImages report={report} />
    <Text selectable style={theme.typography.body}>{report.localizacao}{report.bairro ? ` · ${report.bairro}` : ''}</Text>
    {!!report.User?.username && <Text style={theme.typography.body}>Publicado por {report.User.username}</Text>}
    {!!report.createdAt && <Text style={theme.typography.caption}>{new Date(report.createdAt).toLocaleDateString('pt-BR')}</Text>}
    <Text accessibilityRole="header" style={theme.typography.heading}>Histórico de acompanhamento</Text>
    {historyError ? <>
      <Text accessibilityRole="alert">{historyError}</Text>
      <Button title="Recarregar histórico" onPress={() => setHistoryAttempt((value) => value + 1)} />
    </> : history === null ? <ActivityIndicator accessibilityLabel="Carregando histórico" />
      : history.length === 0 ? <Text>Nenhuma alteração registrada.</Text>
        : history.map((entry) => <View key={entry.id} style={{ padding: 16, gap: 8, backgroundColor: theme.colors.surface, borderRadius: 8 }}>
          <Text style={theme.typography.button}>{entry.tipo === 'moderacao' ? 'Moderação' : 'Andamento'}: {labels[entry.statusNovo] ?? entry.statusNovo}</Text>
          {!!entry.statusAnterior && <Text>Anterior: {labels[entry.statusAnterior] ?? entry.statusAnterior}</Text>}
          {!!entry.motivo && <Text>{entry.motivo}</Text>}
          {!!entry.responsavel && <Text>Setor: {entry.responsavel}</Text>}
          <Text>{new Date(entry.createdAt).toLocaleString('pt-BR')}</Text>
        </View>)}
  </> : <ActivityIndicator accessibilityLabel="Carregando denúncia" color={theme.colors.primary} />}</Screen>;
}
