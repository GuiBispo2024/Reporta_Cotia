import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker } from 'react-native-maps';
import { Screen } from '../components/Screen';
import { Surface } from '../components/Surface';
import { Hero } from '../components/Hero';
import { Button } from '../components/Button';
import { Choices } from '../components/Choices';
import { NativeReportMap } from '../components/NativeReportMap';
import { useAuth } from '../context/AuthContext';
import { categories } from '../services/reportService';
import { getCommunity, type Community, type CommunityFilters, type CommunityPoint } from '../services/communityService';
import { getDevicePosition } from '../services/locationService';
import { toApiError } from '../utils/ApiError';
import { resolutionLabels } from './ReportsScreen';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function CommunityScreen({ navigation }: { navigation: Pick<NativeStackNavigationProp<RootStackParamList>, 'navigate'> }) {
  const { client } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = fontScale > 1.3 || width / fontScale < 320;
  const [filters, setFilters] = useState<CommunityFilters>({});
  const [applied, setApplied] = useState<CommunityFilters>({});
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null), [page, setPage] = useState(1);
  const [locating, setLocating] = useState(false), [locationMessage, setLocationMessage] = useState('');
  const locatingRef = useRef(false), focusVersion = useRef(0);
  const map = useRef<MapView>(null);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); const version = ++focusVersion.current;
    setLoading(true); setError(''); setData(null); setSelected(null); setPage(1); setLocationMessage(''); setLocating(false);
    void getCommunity(client, applied, controller.signal).then(
      result => { if (!controller.signal.aborted) setData(result); },
      reason => { if (!controller.signal.aborted) setError(toApiError(reason).message); },
    ).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (focusVersion.current === version) focusVersion.current++; };
  }, [client, applied, attempt]));
  const groups = useMemo(() => {
    const result = new Map<string, { latitude: number; longitude: number; points: CommunityPoint[] }>();
    for (const point of data?.points ?? []) {
      const key = `${point.latitude},${point.longitude}`;
      const group = result.get(key) ?? { latitude: point.latitude, longitude: point.longitude, points: [] };
      group.points.push(point); result.set(key, group);
    }
    return result;
  }, [data]);
  const visible = selected ? groups.get(selected)?.points ?? [] : data?.points ?? [];
  async function center() {
    if (locatingRef.current) return;
    locatingRef.current = true; setLocating(true); setLocationMessage(''); const version = focusVersion.current;
    try {
      const position = await getDevicePosition();
      if (version !== focusVersion.current) return;
      if (map.current) {
        map.current.animateToRegion({ latitude: position.latitude, longitude: position.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
        setLocationMessage('Localização usada somente para centralizar este mapa; ela não foi enviada à API Reporta Cotia.');
      } else setLocationMessage('Localização obtida, mas o mapa não está disponível nesta instalação. Você pode consultar a lista de ocorrências.');
    } catch (reason) { if (version === focusVersion.current) setLocationMessage(toApiError(reason).message); }
    finally { locatingRef.current = false; if (version === focusVersion.current) setLocating(false); }
  }
  return <Screen>
    <Hero title="Cotia no mapa" description="Ocorrências aprovadas e participação da comunidade." icon="geo-alt-fill" />
    <Surface>
      <Text accessibilityRole="header" style={theme.typography.heading}>Filtrar ocorrências</Text>
      <Choices label="Categoria" value={filters.categoria ?? ''} options={[{ value: '', label: 'Todas' }, ...categories.map(value => ({ value, label: value }))]} onChange={categoria => setFilters(current => ({ ...current, categoria: categoria || undefined }))} />
      <Choices label="Situação" value={filters.resolucaoStatus ?? ''} options={[{ value: '', label: 'Todas' }, ...Object.entries(resolutionLabels).map(([value, label]) => ({ value, label }))]} onChange={resolucaoStatus => setFilters(current => ({ ...current, resolucaoStatus: resolucaoStatus || undefined }))} />
      <Button title="Aplicar filtros do mapa" icon="sliders" variant="primary" disabled={loading} onPress={() => { setApplied(filters); setAttempt(value => value + 1); }} />
      <Button title="Atualizar comunidade" icon="arrow-clockwise" loading={loading} onPress={() => setAttempt(value => value + 1)} />
    </Surface>
    {loading ? <ActivityIndicator accessibilityLabel="Carregando comunidade" /> : error ? <Surface>
      <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>
      <Button title="Tentar novamente a comunidade" onPress={() => setAttempt(value => value + 1)} />
    </Surface> : data && <>
      <Surface>
        <Text accessibilityRole="header" style={theme.typography.heading}>Nossa comunidade</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {([['Denúncias públicas', data.summary.total], ['Em andamento', data.summary.em_andamento], ['Resolvidas', data.summary.resolvida]] as const).map(([label, count]) => <View key={label} accessible accessibilityLabel={`${label}: ${count}`} style={{ flexBasis: singleColumn ? '100%' : '45%', flexGrow: 1, padding: 12, borderRadius: 10, backgroundColor: theme.colors.tint }}>
            <Text style={theme.typography.heading}>{count.toLocaleString('pt-BR')}</Text><Text style={theme.typography.body}>{label}</Text>
          </View>)}
        </View>
        <Text>Totais atuais das aprovadas para os filtros aplicados, incluindo denúncias sem GPS. Andamento e resolvidas já fazem parte do total.</Text>
        <Text accessibilityRole="header" style={theme.typography.button}>Por categoria</Text>
        {data.categories.map(item => <Text key={item.label}>{item.label}: {item.total.toLocaleString('pt-BR')}</Text>)}
        {data.summary.total === 0 && <Text>Nenhuma denúncia pública para estes filtros.</Text>}
      </Surface>
      <Surface>
        <Text accessibilityRole="header" style={theme.typography.heading}>Localizações aproximadas</Text>
        <Text>Os pontos representam regiões de aproximadamente 1 km, sem endereço residencial. Ocorrências na mesma região são agrupadas.</Text>
        <Text accessibilityLiveRegion="polite">{data.points.length} de {data.total} ocorrências com coordenadas válidas carregadas.</Text>
        {data.truncated && <Text accessibilityRole="alert">Resultados limitados às {data.limit} ocorrências mais recentes com localização. Este mapa não contém todas as denúncias da cidade. Use filtros para reduzir os resultados.</Text>}
        {data.invalidPoints > 0 && <Text>{data.invalidPoints} pontos inválidos foram omitidos.</Text>}
        <NativeReportMap ref={map} accessibilityLabel="Mapa comunitário de Cotia" style={{ height: 320, width: '100%' }}
          initialRegion={{ latitude: -23.6, longitude: -46.92, latitudeDelta: 0.2, longitudeDelta: 0.2 }}>
          {[...groups].map(([key, group]) => <Marker key={key} coordinate={{ latitude: group.latitude, longitude: group.longitude }} tracksViewChanges={false}
            title={group.points.length === 1 ? group.points[0]!.titulo : `${group.points.length} ocorrências nesta região`}
            description="Localização aproximada" onPress={() => { setSelected(key); setPage(1); }} />)}
        </NativeReportMap>
        {data.points.length === 0 && <Text>Nenhuma ocorrência com coordenadas válidas neste recorte.</Text>}
        <Button title="Centralizar na minha localização" icon="geo-alt-fill" loading={locating} onPress={() => void center()} />
        {!!locationMessage && <Text accessibilityRole="alert">{locationMessage}</Text>}
        {selected && <Button title="Mostrar todas as ocorrências carregadas" onPress={() => { setSelected(null); setPage(1); }} />}
        <Text accessibilityRole="header" style={theme.typography.heading}>{selected ? 'Ocorrências da região selecionada' : 'Ocorrências carregadas'}</Text>
        {visible.slice((page - 1) * 12, page * 12).map(point => <View key={point.id} style={{ gap: 8 }}>
          <Text style={theme.typography.button}>{point.titulo}</Text><Text>{point.categoria} · {resolutionLabels[point.resolucaoStatus]}</Text>
          <Button title={`Ver ocorrência #${point.id}`} onPress={() => navigation.navigate('ReportDetail', { id: point.id })} />
        </View>)}
        {visible.length > 12 && <><Text>Página {page} de {Math.ceil(visible.length / 12)}</Text>
          <Button title="Ocorrências anteriores" disabled={page <= 1} onPress={() => setPage(value => value - 1)} />
          <Button title="Próximas ocorrências" disabled={page * 12 >= visible.length} onPress={() => setPage(value => value + 1)} /></>}
      </Surface>
    </>}
  </Screen>;
}
