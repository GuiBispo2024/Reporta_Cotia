import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getPersonalBoard, type PersonalBoardSummary } from '../services/boardService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Surface } from './Surface';

type State = { ownerId: number } & (
  { status: 'loading' } | { status: 'ready'; summary: PersonalBoardSummary } | { status: 'error'; message: string }
);
function Counter({ label, count, icon, fullWidth = false, singleColumn }: {
  label: string; count: number; icon: IconName; fullWidth?: boolean; singleColumn: boolean;
}) {
  const formatted = count.toLocaleString('pt-BR');
  return <View accessible accessibilityRole="text" accessibilityLabel={`${label}: ${formatted}`}
    style={[styles.counter, fullWidth && styles.total, { flexBasis: singleColumn || fullWidth ? '100%' : '46%' }]}>
    {fullWidth ? <>
      <Icon name={icon} size={20} />
      <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
      <Text style={styles.count}>{formatted}</Text>
    </> : <>
      <View style={styles.countRow}><Icon name={icon} size={20} /><Text style={styles.count}>{formatted}</Text></View>
      <Text style={styles.caption}>{label}</Text>
    </>}
  </View>;
}

export function PersonalReportBoard({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const { client, user, restoring } = useAuth();
  const [state, setState] = useState<State | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = width / fontScale < 320 || fontScale > 1.3;
  const ownerId = user?.id;
  useFocusEffect(useCallback(() => {
    if (!ownerId || restoring) return;
    const controller = new AbortController();
    setState({ ownerId, status: 'loading' });
    void getPersonalBoard(client, controller.signal).then(
      (summary) => { if (!controller.signal.aborted) setState({ ownerId, status: 'ready', summary }); },
      (reason: unknown) => { if (!controller.signal.aborted) setState({ ownerId, status: 'error', message: toApiError(reason).message }); },
    );
    return () => controller.abort();
  }, [client, ownerId, restoring, refreshVersion, attempt]));

  if (!ownerId || restoring) return null;
  const current = state?.ownerId === ownerId ? state : null;
  return <Surface>
    <Text accessibilityRole="header" style={theme.typography.heading}>Sua participação</Text>
    <Text style={styles.caption}>Resumo de todas as suas denúncias. A busca e os filtros abaixo alteram apenas a lista.</Text>
    {!current || current.status === 'loading' ? <ActivityIndicator accessibilityLabel="Carregando indicadores pessoais" color={theme.colors.primary} />
      : current.status === 'error' ? <>
        <Text accessibilityRole="alert" style={styles.error}>{current.message}</Text>
        <Button title="Tentar novamente os indicadores" icon="arrow-clockwise" onPress={() => setAttempt((value) => value + 1)} />
      </> : <>
        {current.summary.total === 0 && <Text accessibilityLiveRegion="polite" style={styles.caption}>Você ainda não registrou denúncias. Use Denunciar para começar sua participação.</Text>}
        <View style={styles.grid}>
          <Counter label="Total de denúncias" count={current.summary.total} icon="clipboard2-check" fullWidth singleColumn={singleColumn} />
        </View>
        <Text accessibilityRole="header" style={styles.label}>Moderação</Text>
        <View style={styles.grid}>
          <Counter label="Pendentes" count={current.summary.pendente} icon="clock" singleColumn={singleColumn} />
          <Counter label="Aprovadas" count={current.summary.approved} icon="shield-check" singleColumn={singleColumn} />
          <Counter label="Rejeitadas" count={current.summary.rejeitada} icon="exclamation-triangle" singleColumn={singleColumn} />
        </View>
        <Text accessibilityRole="header" style={styles.label}>Andamento das aprovadas</Text>
        <View style={styles.grid}>
          <Counter label="Em andamento" count={current.summary.em_andamento} icon="building" singleColumn={singleColumn} />
          <Counter label="Resolvidas" count={current.summary.resolvida} icon="check-circle-fill" singleColumn={singleColumn} />
        </View>
        <Text style={styles.caption}>Em andamento e resolvidas já estão incluídas nas aprovadas.</Text>
      </>}
  </Surface>;
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counter: { flexGrow: 1, minWidth: 0, gap: 4, padding: 12, borderRadius: theme.radius.sm, backgroundColor: theme.colors.tint },
  total: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  count: { fontSize: 26, lineHeight: 34, fontWeight: '700', color: theme.colors.primaryDark, flexShrink: 1 },
  label: { ...theme.typography.button, color: theme.colors.text },
  caption: { ...theme.typography.caption, color: theme.colors.muted },
  error: { ...theme.typography.body, color: theme.colors.danger },
});
