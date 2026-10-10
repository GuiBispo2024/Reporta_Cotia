import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { getReport, type Report } from '../services/reportService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';
import { resolutionLabels } from './ReportsScreen';

export function ReportDetailScreen({ route }: NativeStackScreenProps<RootStackParamList, 'ReportDetail'>) {
  const { client } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
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
    <Text selectable style={theme.typography.body}>{report.descricao}</Text>
    <Text selectable style={theme.typography.body}>{report.localizacao}{report.bairro ? ` · ${report.bairro}` : ''}</Text>
    {!!report.User?.username && <Text style={theme.typography.body}>Publicado por {report.User.username}</Text>}
    {!!report.createdAt && <Text style={theme.typography.caption}>{new Date(report.createdAt).toLocaleDateString('pt-BR')}</Text>}
  </> : <ActivityIndicator accessibilityLabel="Carregando denúncia" color={theme.colors.primary} />}</Screen>;
}
