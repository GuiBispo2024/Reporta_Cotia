import MockAdapter from 'axios-mock-adapter';
import { createHttpClient } from '../src/services/httpClient';
import { getCommunity } from '../src/services/communityService';
const client = createHttpClient({ appEnv: 'development', apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 });
const mock = new MockAdapter(client);
const point = { id: 1, titulo: 'Buraco', categoria: 'Outros', status: 'aprovada', resolucaoStatus: 'aberta', latitude: -23.61, longitude: -46.92 };
const fixture = { scope: 'community', privacy: { coordinatePrecision: 2, approximate: true }, summary: { total: 3, em_andamento: 1, resolvida: 1 }, categories: [{ label: 'Outros', total: 3 }], points: [point], total: 1, limit: 500, truncated: false };
afterEach(() => mock.reset());
afterAll(() => mock.restore());
test('contrato mínimo usa filtros e cancelamento sem consultar denúncias individualmente', async () => {
  const filters = { categoria: 'Outros', resolucaoStatus: 'aberta' }, controller = new AbortController();
  mock.onGet('community', { params: filters }).reply(200, { ...fixture, points: [{ ...point, email: 'privado', localizacao: 'Rua 123' }] });
  const result = await getCommunity(client, filters, controller.signal);
  expect(result.points).toEqual([point]); expect(result.summary.total).toBe(3);
  expect(JSON.stringify(result)).not.toMatch(/privado|123/);
  expect(mock.history.get).toHaveLength(1); expect(mock.history.get[0]?.signal).toBe(controller.signal);
});
test.each([
  {}, { ...fixture, scope: 'analytical' }, { ...fixture, privacy: { approximate: true, coordinatePrecision: 7 } },
  { ...fixture, points: [{ ...point, status: 'pendente' }] },
  { ...fixture, points: [{ ...point, latitude: -23.612345 }] },
  { ...fixture, total: 501 }, { ...fixture, truncated: true },
  { ...fixture, summary: { ...fixture.summary, total: -1 } },
  { ...fixture, categories: [{ label: 'Outros', total: 2 }] },
])('rejeita projeção inválida ou insegura %j', async (data) => {
  mock.onGet('community').reply(200, data);
  await expect(getCommunity(client)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('coordenadas ausentes/fora dos limites são omitidas e informadas', async () => {
  mock.onGet('community').reply(200, { ...fixture, total: 3, points: [point, { ...point, id: 2, latitude: null }, { ...point, id: 3, longitude: 181 }] });
  const result = await getCommunity(client);
  expect(result.points).toEqual([point]); expect(result.invalidPoints).toBe(2);
});
test('preserva truncamento de 500 pontos de um conjunto maior e erros de rede', async () => {
  mock.onGet('community').replyOnce(200, { ...fixture, summary: { total: 501, em_andamento: 1, resolvida: 1 }, categories: [{ label: 'Outros', total: 501 }], points: Array.from({ length: 500 }, (_, i) => ({ ...point, id: i + 1 })), total: 501, truncated: true }).onGet('community').networkError();
  const result = await getCommunity(client); expect(result.truncated).toBe(true); expect(result.points).toHaveLength(500);
  await expect(getCommunity(client)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
});
