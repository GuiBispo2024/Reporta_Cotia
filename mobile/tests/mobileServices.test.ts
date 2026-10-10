import MockAdapter from 'axios-mock-adapter';
import { createHttpClient } from '../src/services/httpClient';
import { login, register, getMe } from '../src/services/authService';
import { listReports, createReport, getReport } from '../src/services/reportService';

const client = createHttpClient({ appEnv: 'development', apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 });
const mock = new MockAdapter(client);
const user = { id: 7, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] };
const input = { titulo: 'Buraco', descricao: 'Descrição', localizacao: 'Rua A', bairro: '', categoria: 'Outros' };
const report = { ...input, id: 1, status: 'aprovada', resolucaoStatus: 'aberta' };
afterEach(() => mock.reset());
afterAll(() => mock.restore());
test('login normaliza e-mail e rejeita uma sessão sem token', async () => {
  mock.onPost('users/login', { email: 'ana@example.org', password: '123456' }).reply(200, { token: 'jwt', user });
  await expect(login(client, ' ANA@example.org ', '123456')).resolves.toEqual({ token: 'jwt', user });
  mock.resetHandlers();
  mock.onPost('users/login').reply(200, { user });
  await expect(login(client, 'ana@example.org', '123456')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('cadastro envia apenas campos públicos e mantém conflito como erro', async () => {
  mock.onPost('users', { username: 'Ana', email: 'ana@example.org', password: '123456' }).reply(409, { message: 'E-mail já cadastrado.' });
  await expect(register(client, ' Ana ', 'ANA@example.org', '123456')).rejects.toMatchObject({ status: 409 });
});
test('perfil não aceita uma resposta sem permissões', async () => {
  mock.onGet('users/me').reply(200, { id: 7, username: 'Ana', email: 'ana@example.org' });
  await expect(getMe(client)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('lista usa paginação e busca no contrato do backend', async () => {
  mock.onGet('denuncia', { params: { page: 2, limit: 12, titulo: 'Buraco' } }).reply(200, { data: [report], total: 13, totalPages: 2, page: 2 });
  await expect(listReports(client, 2, ' Buraco ')).resolves.toMatchObject({ page: 2, data: [report] });
});
test('criação envia texto e retorna o protocolo pendente', async () => {
  mock.onPost('denuncia', input).reply(201, { denuncia: { ...report, status: 'pendente' } });
  await expect(createReport(client, { ...input, titulo: ' Buraco ' })).resolves.toMatchObject({ id: 1, status: 'pendente' });
});
test('detalhes e lista rejeitam respostas sem contrato', async () => {
  mock.onGet('denuncia/1').reply(200, { message: 'ok' });
  mock.onGet('denuncia').reply(200, []);
  await expect(getReport(client, 1)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  await expect(listReports(client, 1, '')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
