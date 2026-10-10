import { Text, Pressable } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { createHttpClient } from '../src/services/httpClient';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('../src/config/environment', () => ({ getEnvironment: () => ({ appEnv: 'development', apiBaseUrl: 'http://localhost:5000', apiTimeoutMs: 15000 }) }));
jest.mock('../src/services/httpClient', () => ({ createHttpClient: jest.fn() }));
const client = axios.create();
const mock = new MockAdapter(client);
const user = { id: 1, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] };
function Child() {
  const { user: current, restoring, signIn, signOut } = useAuth();
  return <>
    <Text>{restoring ? 'Carregando' : current?.username ?? 'Visitante'}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Login" onPress={() => void signIn('ana@example.org', '123456')}><Text>Login</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Logout" onPress={() => void signOut()}><Text>Logout</Text></Pressable>
  </>;
}
beforeEach(() => {
  jest.clearAllMocks(); mock.reset(); delete client.defaults.headers.common.Authorization;
  jest.mocked(createHttpClient).mockReturnValue(client);
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
  jest.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);
});
afterAll(() => mock.restore());
test('restaura sessão validando perfil e remove token quando a API retorna 401', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify({ apiBaseUrl: 'http://localhost:5000', session: { token: 'jwt', user } }));
  mock.onGet('users/me').reply(200, user);
  mock.onGet('protected').reply(401);
  render(<AuthProvider><Child /></AuthProvider>);
  await screen.findByText('Ana');
  expect(client.defaults.headers.common.Authorization).toBe('Bearer jwt');
  await act(async () => { await client.get('protected').catch(() => {}); });
  await screen.findByText('Visitante');
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('reporta-session-development');
});
test('login persiste sessão e logout remove o token mesmo com falha de rede na revogação', async () => {
  mock.onPost('users/login').reply(200, { token: 'jwt', user });
  mock.onPost('users/logout').networkError();
  render(<AuthProvider><Child /></AuthProvider>);
  await screen.findByText('Visitante');
  fireEvent.press(screen.getByRole('button', { name: 'Login' }));
  await screen.findByText('Ana');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('reporta-session-development', expect.stringContaining('jwt'));
  fireEvent.press(screen.getByRole('button', { name: 'Logout' }));
  await screen.findByText('Visitante');
  await waitFor(() => expect(SecureStore.deleteItemAsync).toHaveBeenCalled());
});
test('não restaura token associado a outra API', async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify({ apiBaseUrl: 'http://another-api:5000', session: { token: 'jwt', user } }));
  render(<AuthProvider><Child /></AuthProvider>);
  await screen.findByText('Visitante');
  expect(mock.history.get).toHaveLength(0);
  expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
});
