import MockAdapter from 'axios-mock-adapter';
import { createHttpClient } from '../src/services/httpClient';
import { getPersonalBoard, parsePersonalBoard } from '../src/services/boardService';

const summary = { total: 12, pendente: 3, approved: 7, rejeitada: 2, em_andamento: 2, resolvida: 4 };
const client = createHttpClient({ appEnv: 'development', apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 });
const mock = new MockAdapter(client);
afterEach(() => mock.reset());
afterAll(() => mock.restore());

test('uma consulta autenticada ao board pessoal usa summary global e descarta colunas', async () => {
  const controller = new AbortController();
  mock.onGet('boards/mine', { params: { column: 'pendente', limit: 1 } }).reply(200, {
    scope: 'mine', summary: { ...summary, aberta: 1, resolutionRate: 57 }, columns: [{ reports: [{ id: 9, titulo: 'Privado' }] }],
  });
  await expect(getPersonalBoard(client, controller.signal)).resolves.toEqual(summary);
  expect(mock.history.get).toHaveLength(1);
  expect(mock.history.get[0]?.signal).toBe(controller.signal);
  expect(mock.history.get[0]?.params).not.toHaveProperty('userId');
  expect(summary.approved).toBe(7); // Includes ongoing/resolved; not another disjoint total.
});

test.each([
  null, {}, { scope: 'mine' }, { scope: 'public', summary },
  ...[undefined, -1, 0.5, '12', Number.MAX_SAFE_INTEGER + 1].map((total) => ({ scope: 'mine', summary: { ...summary, total } })),
  { scope: 'mine', summary: { ...summary, total: 13 } },
  { scope: 'mine', summary: { ...summary, em_andamento: 4 } },
  { scope: 'mine', summary: { ...summary, resolvida: -1 } },
])('rejeita contrato inválido ou dimensões incompatíveis: %j', async (data) => {
  mock.onGet('boards/mine').reply(200, data);
  await expect(getPersonalBoard(client)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});

test('conta sem denúncias tem todos os contadores zerados', () => {
  const empty = { total: 0, pendente: 0, approved: 0, rejeitada: 0, em_andamento: 0, resolvida: 0 };
  expect(parsePersonalBoard({ scope: 'mine', summary: empty })).toEqual(empty);
});

test('preserva erros de rede e sessão expirada sem retry próprio', async () => {
  mock.onGet('boards/mine').networkErrorOnce().onGet('boards/mine').reply(401, { code: 'SESSION_REVOKED', message: 'Entre novamente.' });
  await expect(getPersonalBoard(client)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  await expect(getPersonalBoard(client)).rejects.toMatchObject({ status: 401, code: 'SESSION_REVOKED' });
  expect(mock.history.get).toHaveLength(2);
});

test('cancelamento permanece cancelamento', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(getPersonalBoard(client, controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  expect(mock.history.get).toHaveLength(0);
});
