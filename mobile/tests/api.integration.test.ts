import { createHttpClient } from '../src/services/httpClient';
import { getApiHealth } from '../src/services/healthService';

const liveTest = process.env.REPORTA_API_SMOKE === '1' ? test : test.skip;

liveTest('cliente mobile consulta a API real e confirma conexão com PostgreSQL', async () => {
  const client = createHttpClient({
    appEnv: 'development',
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:5000',
    apiTimeoutMs: Number(process.env.API_TIMEOUT_MS ?? 15000),
  });
  const result = await getApiHealth(undefined, client);
  expect(result).toMatchObject({ name: 'Reporta Cotia API', status: 'ok', database: 'connected' });
}, 125000);
