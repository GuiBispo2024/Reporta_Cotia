import * as Location from 'expo-location';
import { ApiError } from '../utils/ApiError';

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ApiError('Não foi possível obter a localização a tempo. Tente novamente ou informe o endereço manualmente.', 'LOCATION_TIMEOUT')), milliseconds);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
export function parseCoordinates(latitude: string, longitude: string): { latitude?: number; longitude?: number } {
  if (!latitude.trim() && !longitude.trim()) return {};
  const lat = Number(latitude.trim().replace(',', '.')); const lon = Number(longitude.trim().replace(',', '.'));
  if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new ApiError('Informe latitude entre -90 e 90 e longitude entre -180 e 180, ou remova ambas.', 'INVALID_COORDINATES');
  }
  return { latitude: lat, longitude: lon };
}
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number; address: string; neighborhood: string; accuracy: number | null }> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new ApiError('Permita a localização nas configurações ou preencha o endereço manualmente.', 'PERMISSION_DENIED');
  if (!await Location.hasServicesEnabledAsync()) throw new ApiError('Ative a localização do celular ou preencha o endereço manualmente.', 'LOCATION_DISABLED');
  const { coords } = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 15000);
  let address = ''; let neighborhood = '';
  try {
    const [place] = await withTimeout(Location.reverseGeocodeAsync(coords), 5000);
    if (place) {
      address = [place.street, place.streetNumber, place.city].filter(Boolean).join(', ');
      neighborhood = place.district ?? '';
    }
  } catch { /* GPS funciona mesmo se a consulta de endereço estiver indisponível. */ }
  return { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, address, neighborhood };
}
