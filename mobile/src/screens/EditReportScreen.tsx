import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { getReport, type Report } from '../services/reportService';
import { openDraftStore } from '../services/draftService';
import { toApiError } from '../utils/ApiError';
import { CreateReportScreen } from './CreateReportScreen';
import type { RootStackParamList } from '../navigation/types';
export function EditReportScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'EditReport'>) {
  const { client, user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError(''); setReport(null);
    void getReport(client, route.params.id, controller.signal).then(async (value) => {
      if (controller.signal.aborted) return;
      if (value.userId !== user?.id || !user?.permissions.includes('denuncia.update_own')) { setError('Sua conta não pode corrigir esta denúncia.'); return; }
      if (value.status !== 'rejeitada') {
        await (await openDraftStore(client.defaults.baseURL ?? '', user.id, `report-${value.id}`)).discard().catch(() => {});
        if (!controller.signal.aborted) setError('Esta denúncia já está em análise ou aprovada. Consulte o protocolo.'); return;
      }
      setReport(value);
    }).catch((reason) => { if (!controller.signal.aborted) setError(toApiError(reason).message); });
    return () => controller.abort();
  }, [client, route.params.id, user?.id, attempt]);
  if (report) return <CreateReportScreen key={report.id} navigation={navigation} initialReport={report} />;
  return <Screen>{error ? <>
    <Text accessibilityRole="alert">{error}</Text>
    <Button title="Ver protocolo" onPress={() => navigation.replace('ReportDetail', { id: route.params.id })} />
    <Button title="Tentar novamente" onPress={() => setAttempt((value) => value + 1)} />
  </> : <ActivityIndicator accessibilityLabel="Carregando denúncia para correção" />}</Screen>;
}
