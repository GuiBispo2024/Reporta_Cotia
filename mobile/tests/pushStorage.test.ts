import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as SecureStore from 'expo-secure-store';
import { clearPushBinding, detachPushOnLogout, installationId, loadPushBinding, savePushBinding, type PushBinding } from '../src/services/pushStorage';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'd5b106a6-88a1-4bdb-bf68-a82feb696921' }));
jest.mock('../src/config/environment', () => ({ getEnvironment: () => ({ appEnv: 'development', apiBaseUrl: 'https://api.invalid' }) }));
const values = new Map<string, string>(); const raw = axios.create(); const mock = new MockAdapter(raw);
const binding: PushBinding = { apiBaseUrl: 'https://api.invalid', userId: 1, deviceId: 'e5b106a6-88a1-4bdb-bf68-a82feb696921', installationId: 'd5b106a6-88a1-4bdb-bf68-a82feb696921', version: 1, expoPushToken: 'ExpoPushToken[abc123456789]', platform: 'ios', enabled: true, pendingRemoval: false };
beforeEach(() => {
  values.clear(); mock.reset();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => values.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { values.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { values.delete(key); });
});
afterAll(() => mock.restore());
test('logout offline persiste cancelamento sem guardar credencial da conta', async () => {
  await savePushBinding(binding); mock.onDelete().networkError();
  await detachPushOnLogout(raw, 'old-access', 1, binding.apiBaseUrl);
  expect(await loadPushBinding()).toMatchObject({ enabled: false, pendingRemoval: true }); expect(JSON.stringify([...values])).not.toContain('old-access');
  expect(mock.history.delete[0]!.headers?.['If-Match']).toBe('1');
});
test('limpeza tardia não apaga nova conta ou versão', async () => {
  await savePushBinding({ ...binding, userId: 2, version: 2 }); await clearPushBinding(binding);
  expect(await loadPushBinding()).toMatchObject({ userId: 2, version: 2 });
});
test('logout remove apenas vínculo do próprio ambiente e conta', async () => {
  await savePushBinding(binding); mock.onDelete().reply(204);
  await detachPushOnLogout(raw, 'token', 2, binding.apiBaseUrl); expect(mock.history.delete).toHaveLength(0);
  await detachPushOnLogout(raw, 'token', 1, binding.apiBaseUrl); expect(await loadPushBinding()).toBeNull();
});
test('instalação é estável e armazenamento corrompido não quebra autenticação', async () => {
  expect(await installationId()).toBe(await installationId()); values.set('reporta-push-development', '{'); expect(await loadPushBinding()).toBeNull();
});
