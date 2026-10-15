import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { uploadAvatar } from '../src/services/avatarService';
import { createHttpClient } from '../src/services/httpClient';
import { login, register, getMe } from '../src/services/authService';
import { listReports, listMyReports, createReport, getReport, getReportHistory, getSubmission, updateReport } from '../src/services/reportService';

// Axios captura o construtor FormData ao importar: usar o polyfill nativo desde o início.
jest.mock('axios', () => {
  global.FormData = require('react-native/Libraries/Network/FormData').default;
  return jest.requireActual('axios');
});

const client = createHttpClient({ appEnv: 'development', apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 });
const mock = new MockAdapter(client);
const user = { id: 7, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] };
const input = { titulo: 'Buraco', descricao: 'Descrição', localizacao: 'Rua A', bairro: '', categoria: 'Outros' };
const report = { ...input, id: 1, status: 'aprovada', resolucaoStatus: 'aberta' };
afterEach(() => mock.reset());
afterAll(() => mock.restore());
test('avatar usa upload multipart no campo avatar', async () => {
  mock.onPost('users/avatar').reply((config) => {
    const parts = (config.data as FormData & { getParts: () => any[] }).getParts();
    expect(parts.find((part) => part.fieldName === 'avatar')).toMatchObject({ uri: 'file:///avatar.jpg', type: 'image/jpeg' });
    return [200, {}];
  });
  await uploadAvatar(client, { uri: 'file:///avatar.jpg', name: 'avatar.jpg', type: 'image/jpeg' });
});
test('envio preserva chave idempotente e repassa progresso real do transporte', async () => {
  const progress = jest.fn();
  mock.onPost('denuncia').reply((config) => {
    expect(config.headers?.['Idempotency-Key']).toBe('stable-key');
    config.onUploadProgress?.({ loaded: 50, total: 100, bytes: 50, lengthComputable: true });
    return [201, { denuncia: report }];
  });
  await createReport(client, input, [], 'stable-key', { onUploadProgress: progress });
  expect(progress).toHaveBeenCalledWith(expect.objectContaining({ loaded: 50, total: 100 }));
});
test('correção usa PUT no protocolo original e envia null para remover coordenadas', async () => {
  mock.onPut('denuncia/1', { ...input, latitude: null, longitude: null, removeImages: true }).reply(200, { denuncia: { ...report, status: 'pendente' } });
  await expect(updateReport(client, 1, input, [], true)).resolves.toMatchObject({ id: 1, status: 'pendente' });
});
test('resposta perdida permite consultar protocolo e repete a mesma chave', async () => {
  const key = 'f1768e55-b65c-4faf-a5cc-51ac3b095676';
  mock.onPost('denuncia').networkErrorOnce();
  await expect(createReport(client, input, [], key)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  expect(mock.history.post[0]?.headers?.['Idempotency-Key']).toBe(key);
  mock.onGet(`denuncia/submissions/${key}`).reply(200, { denuncia: report });
  await expect(getSubmission(client, key)).resolves.toMatchObject({ id: 1 });
});
test('criação transmite coordenadas numéricas sem convertê-las para texto no JSON', async () => {
  mock.onPost('denuncia', { ...input, latitude: -23.6, longitude: -46.9 }).reply(201, { denuncia: report });
  await expect(createReport(client, { ...input, latitude: -23.6, longitude: -46.9 })).resolves.toMatchObject({ id: 1 });
});
test('upload envia anexos como multipart no campo imagens', async () => {
  const originalFormData = global.FormData;
  global.FormData = require('react-native/Libraries/Network/FormData').default;
  const uploadClient = axios.create();
  const uploadMock = new MockAdapter(uploadClient);
  uploadMock.onPost('denuncia').reply((config) => {
    const parts = (config.data as { getParts: () => Array<{ fieldName: string; uri?: string; type?: string }> }).getParts();
    expect(parts.find((part) => part.fieldName === 'imagens')).toMatchObject({ uri: 'file:///foto.jpg', type: 'image/jpeg' });
    return [201, { denuncia: report }];
  });
  try {
    await expect(createReport(uploadClient, input, [{ uri: 'file:///foto.jpg', name: 'foto.jpg', type: 'image/jpeg' }])).resolves.toMatchObject({ id: 1 });
  } finally { global.FormData = originalFormData; uploadMock.restore(); }
});
test('histórico preserva motivo e setor e rejeita respostas inválidas', async () => {
  const entry = { id: 1, tipo: 'moderacao', statusAnterior: 'pendente', statusNovo: 'rejeitada', motivo: 'Informe o número da rua', responsavel: null, createdAt: '2026-10-10T12:00:00Z' };
  mock.onGet('denuncia/1/historico').replyOnce(200, [entry]).onGet('denuncia/1/historico').reply(200, {});
  await expect(getReportHistory(client, 1)).resolves.toEqual([entry]);
  await expect(getReportHistory(client, 1)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
test('minhas denúncias preserva registros privados e pagina a busca', async () => {
  mock.onGet('denuncia/user/7').reply(200, Array.from({ length: 13 }, (_, index) => ({ ...report, id: index + 1, status: 'pendente' })));
  await expect(listMyReports(client, 7, 2, 'Buraco')).resolves.toMatchObject({ total: 13, totalPages: 2, data: [{ id: 13, status: 'pendente' }] });
  await expect(listMyReports(client, 7, 1, 'Iluminação')).resolves.toMatchObject({ total: 0, data: [] });
});
test('login normaliza e-mail e rejeita uma sessão sem token', async () => {
  const session = { token: 'jwt', user, refreshToken: 'a'.repeat(64), sessionId: 'sid', expiresAt: new Date(Date.now() + 300000).toISOString(), idleExpiresAt: new Date(Date.now() + 900000).toISOString(), sessionExpiresAt: new Date(Date.now() + 28800000).toISOString() };
  mock.onPost('users/login', { email: 'ana@example.org', password: '123456' }).reply(200, session);
  await expect(login(client, ' ANA@example.org ', '123456')).resolves.toEqual(session);
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
test('lista transmite filtros combinados ao servidor e filtra registros próprios', async () => {
  const filters = { categoria: 'Outros', resolucaoStatus: 'aberta', sort: 'oldest' as const };
  mock.onGet('denuncia', { params: { page: 1, limit: 12, titulo: '', ...filters } }).reply(200, { data: [report], total: 1, totalPages: 1, page: 1 });
  await expect(listReports(client, 1, '', undefined, filters)).resolves.toMatchObject({ total: 1 });
  mock.onGet('denuncia/user/7').reply(200, [report, { ...report, id: 2, categoria: 'Iluminação pública' }]);
  await expect(listMyReports(client, 7, 1, '', undefined, filters)).resolves.toMatchObject({ total: 1, data: [{ id: 1 }] });
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
