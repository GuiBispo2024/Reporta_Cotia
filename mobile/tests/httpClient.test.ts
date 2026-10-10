import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createHttpClient } from '../src/services/httpClient';
import { getApiHealth } from '../src/services/healthService';
import { readEnvironment } from '../src/config/environment';

const config = { appEnv: 'development' as const, apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 };
const client = createHttpClient(config);
const mock = new MockAdapter(client);
afterEach(() => mock.reset());
afterAll(() => mock.restore());

test('consulta o contrato real de saúde da API', async () => {
  mock.onGet('').reply(200, { name: 'Reporta Cotia API', status: 'ok', database: 'connected', version: '1.0.0' });
  await expect(getApiHealth(undefined, client)).resolves.toMatchObject({ status: 'ok', database: 'connected' });
});
test('rejeita uma resposta 200 com formato inesperado', async () => {
  mock.onGet('').reply(200, { status: 'ok' });
  await expect(getApiHealth(undefined, client)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test.each([400, 401, 403, 404, 409, 429])('preserva o contrato de erro de negócio HTTP %i', async (status) => {
  mock.onGet('users').reply(status, { message: 'Mensagem da API', code: 'BUSINESS_ERROR' });
  await expect(client.get('users')).rejects.toMatchObject({ status, message: 'Mensagem da API', code: 'BUSINESS_ERROR' });
});
test('não expõe detalhes internos do servidor', async () => {
  mock.onGet('').reply(500, { message: 'SQL password=secret' });
  await expect(client.get('')).rejects.toMatchObject({ code: 'SERVER_ERROR', message: expect.not.stringContaining('secret') });
});
test('normaliza erro de rede', async () => {
  mock.onGet('').networkError();
  await expect(client.get('')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
});
test('normaliza timeout', async () => {
  mock.onGet('').timeout();
  await expect(client.get('')).rejects.toMatchObject({ code: 'TIMEOUT' });
});
test('preserva cancelamento para não exibir erro ao sair da tela', async () => {
  const controller = new AbortController();
  controller.abort();
  try { await client.get('', { signal: controller.signal }); throw new Error('Requisição deveria cancelar'); }
  catch (error) { expect(axios.isCancel(error)).toBe(true); }
});
test('resolve localhost no emulador Android e preserva iOS e dispositivos LAN', () => {
  expect(readEnvironment(config, 'android').apiBaseUrl).toBe('http://10.0.2.2:5000');
  expect(readEnvironment(config, 'ios').apiBaseUrl).toBe('http://localhost:5000');
  expect(readEnvironment({ ...config, apiBaseUrl: 'http://192.168.1.20:5000' }, 'android').apiBaseUrl).toBe('http://192.168.1.20:5000');
});
test('configuração ausente ou insegura falha explicitamente', () => {
  expect(() => readEnvironment(undefined, 'ios')).toThrow();
  expect(() => readEnvironment({ ...config, appEnv: 'production' }, 'ios')).toThrow();
});
