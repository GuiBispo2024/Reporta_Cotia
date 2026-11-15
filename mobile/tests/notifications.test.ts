import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { getPushPreferences, registerPushDevice, removePushDevice, resolvePushEvent } from '../src/services/notificationService';
import { parsePushIntent } from '../src/context/PushNotificationContext';
const client = axios.create(); const mock = new MockAdapter(client);
const id = 'e5b106a6-88a1-4bdb-bf68-a82feb696921';
const device = { id, platform: 'android', enabled: true, version: 1, lastSeenAt: new Date().toISOString() };
afterEach(() => mock.reset()); afterAll(() => mock.restore());
test('preferências copiam somente campos seguros e esperam a conta correta', async () => {
  mock.onGet('notifications/preferences').reply(200, { enabled: true, devices: [{ ...device, expoPushToken: 'secret' }] });
  expect(await getPushPreferences(client, 8)).toEqual({ enabled: true, devices: [device] });
  expect(mock.history.get[0]!.headers?.['X-Push-Account']).toBe('8');
});
test.each([null, {}, { enabled: true, devices: [{}] }, { enabled: 'true', devices: [] }])('contrato inválido falha sem fabricar preferências: %j', async data => {
  mock.onGet('notifications/preferences').reply(200, data); await expect(getPushPreferences(client)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('registro não envia proprietário e remoção protege versão', async () => {
  mock.onPost('notifications/devices').reply(200, device); mock.onDelete(`notifications/devices/${id}`).reply(204);
  await registerPushDevice(client, { installationId: id, expoPushToken: 'ExpoPushToken[abc123456789]', platform: 'android', consent: true }, 8);
  expect(JSON.parse(mock.history.post[0]!.data)).not.toHaveProperty('userId');
  await removePushDevice(client, id, 2, 8); expect(mock.history.delete[0]!.headers?.['If-Match']).toBe('2');
});
test('toque ignora URL e ID fornecidos pelo payload; API resolve destino autorizado', async () => {
  expect(parsePushIntent({ type: 'report_update', eventId: id, denunciaId: 999, url: 'https://evil.invalid' })).toBe(id);
  expect(parsePushIntent({ type: 'report_update', denunciaId: 999 })).toBeNull();
  mock.onGet(`notifications/events/${id}`).reply(200, { eventId: id, denunciaId: 4 }); expect(await resolvePushEvent(client, id)).toBe(4);
});
test.each([401, 403, 404, 500])('falha %s não gera destino alternativo', async status => {
  mock.onGet(`notifications/events/${id}`).reply(status); await expect(resolvePushEvent(client, id)).rejects.toBeDefined();
});
