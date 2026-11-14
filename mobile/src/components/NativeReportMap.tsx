import { forwardRef } from 'react';
import { Platform, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type MapViewProps } from 'react-native-maps';
import Constants from 'expo-constants';
export const MAP_UNAVAILABLE = 'O mapa ainda não está configurado nesta instalação. Os dados das ocorrências continuam disponíveis fora do mapa.';
export function nativeMapAvailable() {
  return Platform.OS !== 'android' || Constants.executionEnvironment === 'storeClient' || !!Constants.expoConfig?.extra?.mapsAndroidConfigured;
}

export const NativeReportMap = forwardRef<MapView, MapViewProps>(function NativeReportMap(props, ref) {
  if (!nativeMapAvailable()) {
    return <Text>{MAP_UNAVAILABLE}</Text>;
  }
  return <MapView ref={ref} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
    showsUserLocation={false} showsMyLocationButton={false} toolbarEnabled={false} {...props} />;
});
