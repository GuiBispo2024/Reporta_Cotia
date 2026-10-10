import { Text, Pressable } from 'react-native';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { createHttpClient } from '../src/services/httpClient';
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('../src/config/environment', () => ({ getEnvironment: () => ({ appEnv: 'development', apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 }) }));
jest.mock('../src/services/httpClient', () => ({ createHttpClient: jest.fn() }));
const user = { id: 1, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] };
const fixture = (token = 'access', refreshToken = 'a'.repeat(64)) => ({ token, refreshToken, user, sessionId: 'sid', expiresAt: new Date(Date.now() + 300000).toISOString(), idleExpiresAt: new Date(Date.now() + 900000).toISOString(), sessionExpiresAt: new Date(Date.now() + 28800000).toISOString() });
let client: ReturnType<typeof axios.create>, raw: ReturnType<typeof axios.create>, mock: MockAdapter, rawMock: MockAdapter;
function Child() {
  const { user: current, client: api, restoring, signIn, signOut } = useAuth();
  return <>
    <Text>{restoring ? 'Carregando' : current?.username ?? 'Visitante'}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Login" onPress={() => void signIn('ana@example.org', '123456')}><Text>Login</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Logout" onPress={() => void signOut()}><Text>Logout</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Consultar" onPress={() => void api.get('protected').catch(() => {})}><Text>Consultar</Text></Pressable>
  </>;
}
beforeEach(() => {
  jest.clearAllMocks();
  const factory = jest.requireActual('../src/services/httpClient').createHttpClient;
  const environment = { appEnv: 'development', apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 };
  client = factory(environment); raw = factory(environment); mock = new MockAdapter(client); rawMock = new MockAdapter(raw);
  jest.mocked(createHttpClient).mockReturnValueOnce(client).mockReturnValueOnce(raw);
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined); jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
});
afterEach(() => { mock.restore(); rawMock.restore(); jest.useRealTimers(); });
test('login persiste apenas refresh e logout remove a credencial mesmo offline', async () => {
  rawMock.onPost('users/login').reply(200, fixture()); rawMock.onPost('users/session/end').networkError();
  render(<AuthProvider><Child /></AuthProvider>); await screen.findByText('Visitante');
  fireEvent.press(screen.getByRole('button', { name: 'Login' })); await screen.findByText('Ana');
  const stored = JSON.parse(jest.mocked(SecureStore.setItemAsync).mock.calls[0]![1]);
  expect(stored.refreshToken).toBe('a'.repeat(64)); expect(stored.token).toBeUndefined(); expect(stored.user).toBeUndefined();
  fireEvent.press(screen.getByRole('button', { name: 'Logout' })); await screen.findByText('Visitante');
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('reporta-refresh-development');
});
test('atualização sensível adota nova sessão e persiste somente a nova credencial refresh', async () => {
  rawMock.onPost('users/login').reply(200, fixture());
  const next = { ...fixture('new-access', 'b'.repeat(64)), sessionId: 'new-sid', user: { ...user, email: 'nova@example.org' } };
  rawMock.onPut('users/update').reply(200, next);
  mock.onGet('protected').reply(200, {});
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current.restoring).toBe(false));
  await act(async () => { await hook.result.current.signIn(user.email, '123456'); });
  await act(async () => { await hook.result.current.updateAccount({ username: user.username, email: next.user.email, senhaAtual: '123456' }); });
  expect(hook.result.current.user?.email).toBe(next.user.email);
  await act(async () => { await hook.result.current.client.get('protected'); });
  expect(mock.history.get[0]?.headers?.Authorization).toBe('Bearer new-access');
  const stored = JSON.parse(jest.mocked(SecureStore.setItemAsync).mock.calls.at(-1)![1]);
  expect(stored.refreshToken).toBe(next.refreshToken); expect(stored.token).toBeUndefined(); expect(stored.user).toBeUndefined();
});
test('mudança de nome mantém refresh; resposta posterior ao logout não restaura conta', async () => {
  rawMock.onPost('users/login').reply(200, fixture()); rawMock.onPost('users/session/end').reply(204);
  let complete!: (value: [number, unknown]) => void;
  rawMock.onPut('users/update').replyOnce(200, { user: { ...user, username: 'Ana Nova' } }).onPut('users/update').reply(() => new Promise((resolve) => { complete = resolve; }));
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current.restoring).toBe(false));
  await act(async () => { await hook.result.current.signIn(user.email, '123456'); });
  await act(async () => { await hook.result.current.updateAccount({ username: 'Ana Nova', email: user.email }); });
  expect(hook.result.current.user?.username).toBe('Ana Nova');
  expect(JSON.parse(jest.mocked(SecureStore.setItemAsync).mock.calls.at(-1)![1]).refreshToken).toBe('a'.repeat(64));
  let updating!: Promise<void>;
  await act(async () => { updating = hook.result.current.updateAccount({ username: 'Outra', email: user.email }); await Promise.resolve(); });
  await waitFor(() => expect(complete).toBeDefined());
  await act(async () => { await hook.result.current.signOut(); complete([200, { user }]); await expect(updating).rejects.toMatchObject({ code: 'SESSION_REVOKED' }); });
  expect(hook.result.current.user).toBeNull();
});
test('restauração rotaciona refresh antes de usar dados da conta', async () => {
  const next = fixture('renewed', 'b'.repeat(64));
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify({ ...fixture(), apiBaseUrl: 'http://localhost:5000' }));
  rawMock.onPost('users/session/refresh', { refreshToken: 'a'.repeat(64) }).reply(200, next);
  mock.onGet('protected').reply(200, {});
  render(<AuthProvider><Child /></AuthProvider>); await screen.findByText('Ana');
  fireEvent.press(screen.getByRole('button', { name: 'Consultar' }));
  await act(async () => { await Promise.resolve(); });
  expect(mock.history.get[0]?.headers?.Authorization).toBe('Bearer renewed');
});
test('15 minutos em segundo plano não são renovados ao retornar', async () => {
  jest.useFakeTimers(); rawMock.onPost('users/login').reply(200, fixture()); rawMock.onPost('users/session/end').reply(204);
  render(<AuthProvider><Child /></AuthProvider>); await screen.findByText('Visitante');
  fireEvent.press(screen.getByRole('button', { name: 'Login' })); await screen.findByText('Ana');
  await act(async () => { jest.advanceTimersByTime(900001); });
  await screen.findByText('Visitante'); expect(rawMock.history.post.filter((request) => request.url === 'users/session/refresh')).toHaveLength(0);
});
test('requisições concorrentes renovam apenas uma vez e usam o novo access token', async () => {
  const initial = { ...fixture(), expiresAt: new Date(Date.now() + 1000).toISOString() };
  rawMock.onPost('users/login').reply(200, initial);
  rawMock.onPost('users/session/refresh').reply(200, fixture('renewed', 'b'.repeat(64)));
  mock.onGet('protected').reply(200, {});
  render(<AuthProvider><Child /></AuthProvider>); await screen.findByText('Visitante');
  fireEvent.press(screen.getByRole('button', { name: 'Login' })); await screen.findByText('Ana');
  await act(async () => { await Promise.all([client.get('protected'), client.get('protected')]); });
  expect(rawMock.history.post.filter((request) => request.url === 'users/session/refresh')).toHaveLength(1);
  expect(mock.history.get.every((request) => request.headers?.Authorization === 'Bearer renewed')).toBe(true);
});
test('credencial expirada ao reabrir revoga a família sem tentar renová-la', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify({ ...fixture(), apiBaseUrl: 'http://localhost:5000', idleExpiresAt: new Date(Date.now() - 1000).toISOString() }));
  rawMock.onPost('users/session/end').reply(204);
  render(<AuthProvider><Child /></AuthProvider>); await screen.findByText('Visitante');
  expect(rawMock.history.post).toHaveLength(1); expect(rawMock.history.post[0]?.url).toBe('users/session/end');
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('reporta-refresh-development');
});
