/**
 * @jest-environment node
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
import { createHttpClient } from '../src/services/httpClient';
import { getApiHealth } from '../src/services/healthService';
import { listReports, getReport, getReportHistory } from '../src/services/reportService';

const liveTest = process.env.REPORTA_API_SMOKE === '1' ? test : test.skip;

liveTest('cliente mobile consulta a API real e confirma conexão com PostgreSQL', async () => {
  const client = createHttpClient({
    appEnv: 'development',
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:5000',
    apiTimeoutMs: Number(process.env.API_TIMEOUT_MS ?? 15000),
  });
  // O teste real usa HTTP do Node; os adaptadores nativos são mocks no preset Jest.
  client.defaults.adapter = 'http';
  const result = await getApiHealth(undefined, client);
  expect(result).toMatchObject({ name: 'Reporta Cotia API', status: 'ok', database: 'connected' });
}, 125000);

liveTest('mobile lê a lista pública paginada da API real sem alterar dados', async () => {
  const client = createHttpClient({ appEnv: 'development', apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:5000', apiTimeoutMs: Number(process.env.API_TIMEOUT_MS ?? 15000) });
  client.defaults.adapter = 'http';
  const page = await listReports(client, 1, '');
  expect(page.page).toBe(1);
  expect(page.total).toBeGreaterThanOrEqual(0);
  expect(page.data.every((report) => report.status === 'aprovada')).toBe(true);
  if (page.data[0]) {
    const report = await getReport(client, page.data[0].id);
    expect(report.id).toBe(page.data[0].id);
    const history = await getReportHistory(client, report.id);
    expect(Array.isArray(history)).toBe(true);
  }
}, 125000);
