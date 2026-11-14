import { useState } from 'react';
import { Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { NativeReportMap, nativeMapAvailable, MAP_UNAVAILABLE } from './NativeReportMap';
import { Button } from './Button';
import type { Report } from '../services/reportService';
import { publicAddress } from '../utils/publicAddress';

export function ReportMap({ report, showTitle = true }: { report: Report; showTitle?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  if (report.latitude == null || report.longitude == null) return <Text>Esta denúncia não possui coordenadas para exibir no mapa.</Text>;
  const latitude = Number(report.latitude), longitude = Number(report.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return <Text>Coordenadas indisponíveis para o mapa.</Text>;
  if (!nativeMapAvailable()) return <Text>{MAP_UNAVAILABLE}</Text>;
  return <View style={{ gap: 8 }}>
    {showTitle && <Text accessibilityRole="header">Localização no mapa</Text>}
    {report.locationApproximate && <Text>Localização aproximada para preservar a privacidade.</Text>}
    {!ready && <Text accessibilityLiveRegion="polite">Carregando mapa. Se não aparecer, confira sua conexão.</Text>}
    <NativeReportMap key={`${report.id}-${attempt}`}
      accessibilityLabel={`Mapa da denúncia ${report.titulo}`} style={{ height: 260, width: '100%' }}
      initialRegion={{ latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      onMapReady={() => setReady(true)} showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false}>
      <Marker coordinate={{ latitude, longitude }} title={report.titulo} description={publicAddress(report.localizacao)} />
    </NativeReportMap>
    <Button title="Recarregar mapa" onPress={() => { setReady(false); setAttempt((value) => value + 1); }} />
  </View>;
}
