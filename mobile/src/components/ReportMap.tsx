import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';
import { Button } from './Button';
import type { Report } from '../services/reportService';

export function ReportMap({ report, showTitle = true }: { report: Report; showTitle?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  if (report.latitude == null || report.longitude == null) return <Text>Esta denúncia não possui coordenadas para exibir no mapa.</Text>;
  const latitude = Number(report.latitude), longitude = Number(report.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return <Text>Coordenadas indisponíveis para o mapa.</Text>;
  if (Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient' && !Constants.expoConfig?.extra?.mapsAndroidConfigured) {
    return <Text>O mapa ainda não está configurado nesta instalação. Consulte o endereço acima ou abra a localização no aplicativo de mapas.</Text>;
  }
  return <View style={{ gap: 8 }}>
    {showTitle && <Text accessibilityRole="header">Localização no mapa</Text>}
    {!ready && <Text accessibilityLiveRegion="polite">Carregando mapa. Se não aparecer, confira sua conexão.</Text>}
    <MapView key={`${report.id}-${attempt}`} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      accessibilityLabel={`Mapa da denúncia ${report.titulo}`} style={{ height: 260, width: '100%' }}
      initialRegion={{ latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      onMapReady={() => setReady(true)} showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false}>
      <Marker coordinate={{ latitude, longitude }} title={report.titulo} description={report.localizacao} />
    </MapView>
    <Button title="Recarregar mapa" onPress={() => { setReady(false); setAttempt((value) => value + 1); }} />
  </View>;
}
