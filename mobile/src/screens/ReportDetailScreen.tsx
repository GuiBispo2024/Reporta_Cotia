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
import { ReportProgress } from '../components/ReportProgress';
import { Icon, type IconName } from '../components/Icon';
import { publicAddress } from '../utils/publicAddress';

function SectionTitle({ title, icon }: { title: string; icon: IconName }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <Icon name={icon} /><Text accessibilityRole="header" style={{ ...theme.typography.heading, flex: 1 }}>{title}</Text>
  </View>;
}
function statusHint(report: Report) {
  if (report.status === 'pendente') return 'Sua denúncia foi recebida e aguarda avaliação para publicação.';
  if (report.status === 'rejeitada') return 'A publicação foi recusada na moderação. Confira o motivo abaixo.';
  if (report.status !== 'aprovada') return 'Consulte as atualizações no histórico de acompanhamento.';
  if (report.resolucaoStatus === 'resolvida') return 'O atendimento foi marcado como concluído. Consulte as atualizações no histórico.';
  if (report.resolucaoStatus === 'em_andamento') return 'O setor responsável está trabalhando no atendimento desta denúncia.';
  return 'Sua denúncia está publicada e aguarda atendimento pelo setor responsável.';
}

export function ReportDetailScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'ReportDetail'>) {
  const { client, user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [fullHistory, setFullHistory] = useState(false);
  const [mapError, setMapError] = useState('');
  const labels: Record<string, string> = { ...resolutionLabels, pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };
  useEffect(() => {
    if (!report) return;
    const controller = new AbortController(); setHistory(null); setHistoryError('');
    void getReportHistory(client, route.params.id, controller.signal).then(
      (entries) => { if (!controller.signal.aborted) setHistory([...entries].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || b.id - a.id)); },
      (reason: unknown) => { if (!controller.signal.aborted) setHistoryError(toApiError(reason).message); },
    );
    return () => controller.abort();
  }, [client, route.params.id, report, historyAttempt]);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); setError(''); setReport(null); setHistory(null); setHistoryError(''); setMapError(''); setFullHistory(false);
    void getReport(client, route.params.id, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setReport(data); },
      (reason: unknown) => { if (!controller.signal.aborted) setError(toApiError(reason).message); },
    );
    return () => controller.abort();
  }, [client, route.params.id, attempt]));
  const hasCoordinates = report?.latitude != null && report.longitude != null && Number.isFinite(Number(report.latitude)) && Number.isFinite(Number(report.longitude)) && Math.abs(Number(report.latitude)) <= 90 && Math.abs(Number(report.longitude)) <= 180;
  const hasPhotos = !!report?.imageUrl || !!report?.imageUrls?.length;
  return <Screen>{error ? <Surface>
    <SectionTitle title="Não foi possível abrir a denúncia" icon="exclamation-triangle" />
    <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>
    <Button icon="arrow-clockwise" title="Tentar novamente" onPress={() => setAttempt((value) => value + 1)} />
  </Surface> : report ? <>
    <Hero title={report.titulo} description={`Protocolo #${report.id} · ${report.categoria}`} icon="clipboard2-check">
      {!!report.createdAt && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="calendar3" color={theme.colors.onDarkMuted} size={14} /><Text style={{ ...theme.typography.caption, color: theme.colors.onDarkMuted }}>Enviada em {new Date(report.createdAt).toLocaleDateString('pt-BR')}</Text>
      </View>}
    </Hero>
    <Surface>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Text accessibilityRole="header" style={theme.typography.heading}>Situação atual</Text>
        <View style={{ backgroundColor: report.status === 'rejeitada' ? theme.colors.dangerTint : theme.colors.tint, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}><ReportStatus status={report.status} resolution={report.resolucaoStatus} /></View>
      </View>
      <ReportProgress status={report.status} resolution={report.resolucaoStatus} />
      <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>{statusHint(report)}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 12, borderTopWidth: 1, borderColor: theme.colors.border }}>
        <Icon name="building" size={18} /><Text style={{ ...theme.typography.caption, flex: 1 }}>Setor responsável: {report.setorResponsavel || 'Ainda não definido'}</Text>
      </View>
      {!!report.motivoRejeicao && <View style={{ backgroundColor: theme.colors.dangerTint, borderRadius: 10, padding: 14 }}>
        <Text accessibilityRole="alert" style={{ ...theme.typography.body, color: theme.colors.danger }}>Motivo da rejeição: {report.motivoRejeicao}</Text>
      </View>}
      {report.status === 'rejeitada' && report.userId === user?.id && user?.permissions.includes('denuncia.update_own') && <Button icon="pencil-square" variant="primary" title="Corrigir e reenviar" onPress={() => navigation.navigate('EditReport', { id: report.id })} />}
    </Surface>
    <Surface>
      <SectionTitle title="O que aconteceu" icon="clipboard2-check" />
      <Text selectable style={theme.typography.body}>{report.descricao}</Text>
      {!!report.User?.username && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="person-circle" size={18} color={theme.colors.muted} /><Text style={{ ...theme.typography.caption, color: theme.colors.muted, flex: 1 }}>Publicado por {report.User.username}</Text></View>}
      {!hasPhotos && <Text style={{ ...theme.typography.caption, color: theme.colors.muted }}>Sem fotos anexadas.</Text>}
    </Surface>
    {hasPhotos && <Surface><ReportImages report={report} /><Text style={{ ...theme.typography.caption, color: theme.colors.muted }}>Toque em uma foto para ampliar. Deslize para ver as demais.</Text></Surface>}
    <Surface>
      <SectionTitle title="Onde aconteceu" icon="geo-alt-fill" />
      <Text selectable style={theme.typography.body}>{publicAddress(report.localizacao)}{report.bairro ? ` · ${report.bairro}` : ''}</Text>
      <ReportMap report={report} showTitle={false} />
      {hasCoordinates && <>
        <Text selectable style={{ ...theme.typography.caption, color: theme.colors.muted }}>Coordenadas: {report.latitude}, {report.longitude}</Text>
        <Button icon="geo-alt-fill" title="Ver localização no mapa" onPress={() => { setMapError(''); void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${report.latitude},${report.longitude}`)}`).catch(() => setMapError('Não foi possível abrir o mapa.')); }} />
        {!!mapError && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{mapError}</Text>}
      </>}
    </Surface>
    <Surface>
      <SectionTitle title="Histórico de acompanhamento" icon="clock" />
      {historyError ? <>
        <Text accessibilityRole="alert">{historyError}</Text>
        <Button icon="arrow-clockwise" title="Recarregar histórico" onPress={() => setHistoryAttempt((value) => value + 1)} />
      </> : history === null ? <ActivityIndicator accessibilityLabel="Carregando histórico" />
        : history.length === 0 ? <Text style={{ color: theme.colors.muted }}>Nenhuma alteração registrada.</Text>
          : <>
            <Text style={{ ...theme.typography.caption, color: theme.colors.muted }}>{fullHistory ? 'Todas as atualizações, da mais recente à mais antiga.' : 'Últimas atualizações, da mais recente à mais antiga.'}</Text>
            {(fullHistory ? history : history.slice(0, 3)).map((entry, index) => <View key={entry.id} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 22, gap: 6 }}>
                <Icon name={entry.statusNovo === 'rejeitada' ? 'exclamation-triangle' : entry.statusNovo === 'resolvida' ? 'check-circle-fill' : 'clock'} size={20} color={entry.statusNovo === 'rejeitada' ? theme.colors.danger : index === 0 ? theme.colors.primary : theme.colors.muted} />
                <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: theme.colors.border }} />
              </View>
              <View style={{ flex: 1, gap: 6, paddingBottom: 12 }}>
                <Text style={theme.typography.button}>{entry.tipo === 'moderacao' ? 'Moderação' : 'Andamento'}: {labels[entry.statusNovo] ?? entry.statusNovo}</Text>
                <Text style={{ ...theme.typography.caption, color: theme.colors.muted }}>{new Date(entry.createdAt).toLocaleString('pt-BR')}</Text>
                {!!entry.motivo && <Text style={theme.typography.body}>{entry.motivo}</Text>}
                {!!entry.responsavel && <Text style={theme.typography.caption}>Setor: {entry.responsavel}</Text>}
                {!!entry.statusAnterior && <Text style={{ ...theme.typography.caption, color: theme.colors.muted }}>Anterior: {labels[entry.statusAnterior] ?? entry.statusAnterior}</Text>}
              </View>
            </View>)}
            {history.length > 3 && <Button icon="clock" title={fullHistory ? 'Mostrar menos atualizações' : `Ver histórico completo (${history.length})`} onPress={() => setFullHistory((value) => !value)} />}
          </>}
    </Surface>
    {report.status === 'aprovada' && <>
      <Surface>
        <SectionTitle title="Apoie esta denúncia" icon="heart" />
        <ReportLikes key={`likes-${report.id}`} report={report} />
        <ReportSharing key={`shares-${report.id}`} report={report} />
      </Surface>
      <Surface><ReportComments key={report.id} reportId={report.id} /></Surface>
    </>}
  </> : <ActivityIndicator accessibilityLabel="Carregando denúncia" color={theme.colors.primary} />}</Screen>;
}
