import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { PushNotificationProvider, usePushNotifications } from '../src/context/PushNotificationContext';
import { useAuth } from '../src/context/AuthContext';
import * as api from '../src/services/notificationService';
import * as storage from '../src/services/pushStorage';
import * as native from 'expo-notifications';
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/config/environment', () => ({ getEnvironment: () => ({ appEnv: 'development', apiBaseUrl: 'http://localhost:5000' }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'bare', easConfig: { projectId: 'e5b106a6-88a1-4bdb-bf68-a82feb696921' } } }));
jest.mock('../src/services/pushStorage', () => ({ loadPushBinding: jest.fn(), savePushBinding: jest.fn(), clearPushBinding: jest.fn(), installationId: jest.fn() }));
jest.mock('../src/services/notificationService', () => ({ ...jest.requireActual('../src/services/notificationService'), getPushPreferences: jest.fn(), registerPushDevice: jest.fn(), removePushDevice: jest.fn(), setPushPreference: jest.fn() }));
jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'default', AndroidImportance: { DEFAULT: 3 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
  setNotificationChannelAsync: jest.fn(), getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), getExpoPushTokenAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn().mockResolvedValue(undefined), clearLastNotificationResponse: jest.fn(), getLastNotificationResponse: jest.fn(), setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })), addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
}));
const id = 'e5b106a6-88a1-4bdb-bf68-a82feb696921';
const device = { id, version: 1, platform: 'android' as const, enabled: true, lastSeenAt: new Date().toISOString() };
let auth: ReturnType<typeof useAuth>;
beforeEach(() => {
  jest.clearAllMocks(); jest.replaceProperty(Platform, 'OS', 'android');
  auth = { user: { id: 1 } } as any; jest.mocked(useAuth).mockImplementation(() => auth);
  jest.mocked(storage.loadPushBinding).mockResolvedValue(null); jest.mocked(storage.installationId).mockResolvedValue(id);
  jest.mocked(api.getPushPreferences).mockResolvedValue({ enabled: false, devices: [] });
  jest.mocked(api.registerPushDevice).mockResolvedValue(device);
  jest.mocked(native.getPermissionsAsync).mockResolvedValue({ granted: false } as any);
  jest.mocked(native.requestPermissionsAsync).mockResolvedValue({ granted: true } as any);
  jest.mocked(native.getExpoPushTokenAsync).mockResolvedValue({ data: 'ExpoPushToken[abc123456789]', type: 'expo' });
  jest.mocked(native.getLastNotificationResponse).mockReturnValue(null);
});
afterEach(() => jest.restoreAllMocks());
const wrapper = ({ children }: any) => <PushNotificationProvider>{children}</PushNotificationProvider>;
test('inicialização não pede permissão; ativação explícita cria canal antes do pedido', async () => {
  const { result } = renderHook(usePushNotifications, { wrapper }); await waitFor(() => expect(api.getPushPreferences).toHaveBeenCalled());
  expect(native.requestPermissionsAsync).not.toHaveBeenCalled(); expect(api.registerPushDevice).not.toHaveBeenCalled();
  await act(() => result.current.enable());
  expect(jest.mocked(native.setNotificationChannelAsync).mock.invocationCallOrder[0]!).toBeLessThan(jest.mocked(native.requestPermissionsAsync).mock.invocationCallOrder[0]!);
  expect(api.registerPushDevice).toHaveBeenCalledWith(undefined, expect.objectContaining({ consent: true, expoPushToken: 'ExpoPushToken[abc123456789]' }), 1);
  expect(result.current.enabled).toBe(true);
});
test('permissão negada e rede indisponível têm mensagem sem falso sucesso', async () => {
  const { result } = renderHook(usePushNotifications, { wrapper }); await waitFor(() => expect(api.getPushPreferences).toHaveBeenCalled());
  jest.mocked(native.requestPermissionsAsync).mockResolvedValue({ granted: false } as any);
  await act(() => result.current.enable()); expect(api.registerPushDevice).not.toHaveBeenCalled(); expect(result.current.message).toContain('Permissão desativada');
  jest.mocked(api.getPushPreferences).mockRejectedValue(new Error('network'));
  await act(() => result.current.refresh()); expect(result.current.message).toContain('conexão'); expect(result.current.enabled).toBe(false);
});
test('visitante nunca registra dispositivo; cold start aceita somente evento válido uma vez', async () => {
  auth = { user: null } as any;
  jest.mocked(native.getLastNotificationResponse).mockReturnValue({ actionIdentifier: 'default', notification: { request: { content: { data: { type: 'report_update', eventId: id, denunciaId: 999 } } } } } as any);
  const { result } = renderHook(usePushNotifications, { wrapper }); await waitFor(() => expect(result.current.pendingEvent).toBe(id));
  await act(() => result.current.enable()); expect(api.getPushPreferences).not.toHaveBeenCalled(); expect(api.registerPushDevice).not.toHaveBeenCalled();
  await act(() => result.current.consumeEvent(id)); expect(result.current.pendingEvent).toBeNull(); expect(native.clearLastNotificationResponse).toHaveBeenCalled();
  await act(async () => { jest.mocked(native.addNotificationResponseReceivedListener).mock.calls[0]![0](native.getLastNotificationResponse()!); });
  expect(result.current.pendingEvent).toBeNull();
});
test('rotação usa token Expo renovado e não token FCM recebido pelo listener', async () => {
  jest.mocked(storage.loadPushBinding).mockResolvedValue({ apiBaseUrl: 'http://localhost:5000', userId: 1, installationId: id, deviceId: id, version: 1, expoPushToken: 'old', platform: 'android', enabled: true, pendingRemoval: false });
  jest.mocked(api.getPushPreferences).mockResolvedValue({ enabled: true, devices: [device] });
  jest.mocked(native.getPermissionsAsync).mockResolvedValue({ granted: true } as any);
  const { result } = renderHook(usePushNotifications, { wrapper }); await waitFor(() => expect(result.current.enabled).toBe(true));
  const callback = jest.mocked(native.addPushTokenListener).mock.calls[0]![0];
  await act(async () => { callback({ type: 'android', data: 'native-fcm-token' }); });
  await waitFor(() => expect(api.registerPushDevice).toHaveBeenCalledTimes(2));
  expect(JSON.stringify(jest.mocked(api.registerPushDevice).mock.calls)).not.toContain('native-fcm-token'); expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
});
test('desativação global usa endpoint próprio e logout suprime exibição em foreground', async () => {
  const view = renderHook(usePushNotifications, { wrapper }); await waitFor(() => expect(api.getPushPreferences).toHaveBeenCalled());
  await act(() => view.result.current.disable(true)); expect(api.setPushPreference).toHaveBeenCalledWith(undefined, false, 1);
  auth = { user: null } as any; view.rerender({});
  const handler = jest.mocked(native.setNotificationHandler).mock.calls.find(call => call[0])?.[0];
  expect(await handler?.handleNotification({} as any)).toMatchObject({ shouldShowBanner: false, shouldShowList: false });
});
test('iOS com permissão provisória permite ativar; limpeza remove handler', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.mocked(native.getPermissionsAsync).mockResolvedValue({ granted: false, ios: { status: 3 } } as any);
  jest.mocked(native.requestPermissionsAsync).mockResolvedValue({ granted: false, ios: { status: 3 } } as any);
  const view = renderHook(usePushNotifications, { wrapper }); await waitFor(() => expect(api.getPushPreferences).toHaveBeenCalled());
  await act(() => view.result.current.enable()); expect(view.result.current.enabled).toBe(true); expect(native.setNotificationChannelAsync).not.toHaveBeenCalled();
  view.unmount(); expect(jest.mocked(native.setNotificationHandler).mock.calls.at(-1)?.[0]).toBeNull();
});
test('vínculo da conta anterior é transferido desativado e removido antes de nova ativação', async () => {
  jest.mocked(storage.loadPushBinding).mockResolvedValue({ apiBaseUrl: 'http://localhost:5000', userId: 2, installationId: id, deviceId: id, version: 1, expoPushToken: 'old', platform: 'android', enabled: true, pendingRemoval: false });
  jest.mocked(api.registerPushDevice).mockResolvedValue({ ...device, enabled: false, version: 2 });
  renderHook(usePushNotifications, { wrapper }); await waitFor(() => expect(api.removePushDevice).toHaveBeenCalledWith(undefined, id, 2, 1));
  expect(api.registerPushDevice).toHaveBeenCalledWith(undefined, expect.objectContaining({ consent: false }), 1); expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
});
