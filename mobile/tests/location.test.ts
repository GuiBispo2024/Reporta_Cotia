import * as Location from 'expo-location';
import { getCurrentLocation, parseCoordinates } from '../src/services/locationService';
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn(), hasServicesEnabledAsync: jest.fn(), getCurrentPositionAsync: jest.fn(), reverseGeocodeAsync: jest.fn(), Accuracy: { High: 4 } }));
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>);
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({ coords: { latitude: -23.6, longitude: -46.9, accuracy: 10 } } as Awaited<ReturnType<typeof Location.getCurrentPositionAsync>>);
});
afterEach(() => jest.useRealTimers());
test('coordenadas são opcionais, aceitam zero e vírgula decimal, mas exigem par válido', () => {
  expect(parseCoordinates('', '')).toEqual({});
  expect(parseCoordinates('0', '-46,9')).toEqual({ latitude: 0, longitude: -46.9 });
  for (const pair of [['-23', ''], ['91', '0'], ['0', '181'], ['abc', '0']]) expect(() => parseCoordinates(pair[0]!, pair[1]!)).toThrow();
});
test('GPS mantém coordenadas se geocodificação falhar', async () => {
  jest.mocked(Location.reverseGeocodeAsync).mockRejectedValue(new Error('offline'));
  await expect(getCurrentLocation()).resolves.toMatchObject({ latitude: -23.6, longitude: -46.9, address: '', neighborhood: '' });
});
test('permissão negada e GPS desativado retornam erros acionáveis', async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({ granted: false } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>);
  await expect(getCurrentLocation()).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(false);
  await expect(getCurrentLocation()).rejects.toMatchObject({ code: 'LOCATION_DISABLED' });
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});
test('GPS sem resposta termina com timeout e permite preenchimento manual', async () => {
  jest.useFakeTimers();
  jest.mocked(Location.getCurrentPositionAsync).mockReturnValue(new Promise(() => {}));
  const assertion = expect(getCurrentLocation()).rejects.toMatchObject({ code: 'LOCATION_TIMEOUT' });
  await jest.advanceTimersByTimeAsync(15001);
  await assertion;
});
