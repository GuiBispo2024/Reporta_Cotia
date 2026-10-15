import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
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
import { ReportMap } from '../components/ReportMap';
import { ReportComments } from '../components/ReportComments';
import { ReportLikes } from '../components/ReportLikes';
import { ReportSharing } from '../components/ReportSharing';
import { Hero } from '../components/Hero';
import { Surface } from '../components/Surface';
import { ReportStatus } from '../components/ReportStatus';

export function ReportDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'ReportDetail'>) {
  const { client, user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [mapError, setMapError] = useState('');
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
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setError(''); setReport(null); setHistory(null); setHistoryError(''); setMapError('');
    void getReport(client, route.params.id, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setReport(data); },
      (reason: unknown) => { if (!controller.signal.aborted) setError(toApiError(reason).message); },
    );
    return () => controller.abort();
  }, [client, route.params.id, attempt]));
  return <Screen>{error ? <>
    <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>
    <Button title="Tentar novamente" onPress={() => setAttempt((value) => value + 1)} />
  </> : report ? <>
    <Hero title={report.titulo} description={`Protocolo #${report.id} · ${report.categoria}`} icon="clipboard2-check" />
    <Surface>
    <ReportStatus status={report.status} resolution={report.resolucaoStatus} />
    <Text style={theme.typography.body}>{report.status === 'pendente' ? 'Aguardando moderação' : report.status === 'rejeitada' ? 'Rejeitada na moderação' : resolutionLabels[report.resolucaoStatus] ?? report.resolucaoStatus}</Text>
    <Text style={theme.typography.body}>Setor responsável: {report.setorResponsavel || 'Ainda não definido'}</Text>
    {!!report.motivoRejeicao && <Text accessibilityRole="alert" style={{ ...theme.typography.body, color: theme.colors.danger }}>Motivo da rejeição: {report.motivoRejeicao}</Text>}
    {report.status === 'rejeitada' && report.userId === user?.id && user?.permissions.includes('denuncia.update_own') && <Button title="Corrigir e reenviar" onPress={() => navigation.navigate('EditReport', { id: report.id })} />}
    <Text selectable style={theme.typography.body}>{report.descricao}</Text>
    <ReportImages report={report} />
    <ReportMap report={report} />
    <Text selectable style={theme.typography.body}>{report.localizacao}{report.bairro ? ` · ${report.bairro}` : ''}</Text>
    {report.latitude != null && report.longitude != null && Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude)) && <>
      <Text>Coordenadas: {report.latitude}, {report.longitude}</Text>
      <Button title="Ver localização no mapa" onPress={() => { setMapError(''); void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${report.latitude},${report.longitude}`)}`).catch(() => setMapError('Não foi possível abrir o mapa.')); }} />
      {!!mapError && <Text accessibilityRole="alert">{mapError}</Text>}
    </>}
    {!!report.User?.username && <Text style={theme.typography.body}>Publicado por {report.User.username}</Text>}
    {!!report.createdAt && <Text style={theme.typography.caption}>{new Date(report.createdAt).toLocaleDateString('pt-BR')}</Text>}
    </Surface>
    {report.status === 'aprovada' && <>
      <Surface>
      <ReportLikes key={`likes-${report.id}`} report={report} />
      <ReportSharing key={`shares-${report.id}`} report={report} />
      </Surface>
      <Surface>
      <ReportComments key={report.id} reportId={report.id} />
      </Surface>
    </>}
    <Surface>
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
    </Surface>
  </> : <ActivityIndicator accessibilityLabel="Carregando denúncia" color={theme.colors.primary} />}</Screen>;
}
