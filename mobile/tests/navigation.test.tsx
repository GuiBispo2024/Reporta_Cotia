import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { useAuth } from '../src/context/AuthContext';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/components/Brand', () => ({ Brand: () => null }));
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));
jest.mock('../src/screens/ReportsScreen', () => ({ ReportsScreen: ({ route, navigation }: any) => {
  const { Text, Pressable } = require('react-native');
  return <><Text>{route.name === 'MyReports' ? 'Lista privada' : 'Feed público'}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir detalhe" onPress={() => navigation.navigate('ReportDetail', { id: 9 })}><Text>Detalhe</Text></Pressable></>;
} }));
jest.mock('../src/screens/ProfileScreen', () => ({ ProfileScreen: () => {
  const { Text } = require('react-native'); return <Text>Perfil da conta</Text>;
} }));
jest.mock('../src/screens/CommunityScreen', () => ({ CommunityScreen: ({ navigation }: any) => {
  const { Text, Pressable } = require('react-native');
  return <><Text>Mapa comunitário</Text><Pressable accessibilityRole="button" accessibilityLabel="Abrir ocorrência do mapa" onPress={() => navigation.navigate('ReportDetail', { id: 9 })}><Text>Abrir</Text></Pressable></>;
} }));
jest.mock('../src/screens/CreateReportScreen', () => ({ CreateReportScreen: ({ navigation }: any) => {
  const { Text, Pressable } = require('react-native');
  return <><Text>Formulário existente</Text><Pressable accessibilityRole="button" accessibilityLabel="Voltar à lista" onPress={() => navigation.popToTop()}><Text>Voltar</Text></Pressable></>;
} }));
jest.mock('../src/screens/AccountScreen', () => ({ AccountScreen: ({ navigation }: any) => {
  const { Text, Pressable } = require('react-native');
  return <><Text>Login existente</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancelar login" onPress={() => navigation.goBack()}><Text>Cancelar</Text></Pressable></>;
} }));
jest.mock('../src/screens/ReportDetailScreen', () => ({ ReportDetailScreen: ({ navigation }: any) => {
  const { Text, Pressable } = require('react-native'); return <><Text>Detalhe existente</Text><Pressable accessibilityRole="button" accessibilityLabel="Voltar ao mapa" onPress={() => navigation.goBack()}><Text>Voltar</Text></Pressable></>;
} }));
jest.mock('../src/screens/EditReportScreen', () => ({ EditReportScreen: () => null }));
jest.mock('../src/screens/AccountSecurityScreen', () => ({ AccountSecurityScreen: () => null }));
jest.mock('../src/screens/PasswordScreen', () => ({ PasswordScreen: () => null }));
jest.mock('../src/screens/AboutScreen', () => ({ AboutScreen: () => null }));
jest.mock('../src/screens/HomeScreen', () => ({ HomeScreen: () => null }));

const user = { id: 1, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] };
let context: ReturnType<typeof useAuth>;
beforeEach(() => {
  jest.useFakeTimers();
  context = { user: null, restoring: false, client: {} as any, notice: '', signIn: jest.fn(), signOut: jest.fn(), updateAccount: jest.fn(), reloadProfile: jest.fn() };
  jest.mocked(useAuth).mockImplementation(() => context);
});
afterEach(() => { cleanup(); act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); jest.restoreAllMocks(); });

test.each(['ios', 'android'] as const)('%s: visitante consulta feed; Denunciar abre login e continua no formulário após autenticar', async (os) => {
  jest.replaceProperty(Platform, 'OS', os);
  const view = render(<RootNavigator />);
  await screen.findByText('Feed público');
  expect(screen.queryByLabelText('Aba Minhas denúncias')).toBeNull();
  fireEvent.press(screen.getByLabelText('Denunciar'));
  await screen.findByText('Login existente');
  expect(screen.queryByText('Formulário existente')).toBeNull();
  context = { ...context, user };
  view.rerender(<RootNavigator />);
  await screen.findByText('Formulário existente');
  fireEvent.press(screen.getByRole('button', { name: 'Voltar à lista' }));
  await screen.findByLabelText('Aba Minhas denúncias');
  expect(screen.queryByText('Formulário existente')).toBeNull();
});

test('cinco destinos autenticados reutilizam feed e lista; voltar do formulário mantém aba anterior', async () => {
  context = { ...context, user };
  render(<RootNavigator />);
  await screen.findByLabelText('Aba Minhas denúncias');
  fireEvent.press(screen.getByLabelText('Aba Minhas denúncias'));
  await screen.findByText('Lista privada');
  fireEvent.press(screen.getByLabelText('Denunciar'));
  await screen.findByText('Formulário existente');
  fireEvent.press(screen.getByRole('button', { name: 'Voltar à lista' }));
  await screen.findByText('Lista privada');
  fireEvent.press(screen.getByLabelText('Aba Conta'));
  await screen.findByText('Perfil da conta');
  fireEvent.press(screen.getByLabelText('Aba Início'));
  await screen.findByText('Feed público');
});

test.each([false, true])('mapa e detalhes são acessíveis com autenticação=%s, sem expor Minhas ao visitante', async (authenticated) => {
  context = { ...context, user: authenticated ? user : null };
  render(<RootNavigator />);
  await screen.findByLabelText('Aba Mapa');
  fireEvent.press(screen.getByLabelText('Aba Mapa'));
  await screen.findByText('Mapa comunitário');
  fireEvent.press(screen.getByRole('button', { name: 'Abrir ocorrência do mapa' }));
  await screen.findByText('Detalhe existente');
  fireEvent.press(screen.getByRole('button', { name: 'Voltar ao mapa' }));
  await screen.findByText('Mapa comunitário');
  if (!authenticated) expect(screen.queryByLabelText('Aba Minhas denúncias')).toBeNull();
});

test.each(['logout', 'expiração'])('%s remove formulário e histórico privado do stack', async () => {
  context = { ...context, user };
  const view = render(<RootNavigator />);
  await screen.findByLabelText('Denunciar');
  fireEvent.press(screen.getByLabelText('Denunciar'));
  await screen.findByText('Formulário existente');
  context = { ...context, user: null };
  view.rerender(<RootNavigator />);
  await screen.findByText('Feed público');
  expect(screen.queryByText('Formulário existente')).toBeNull();
  expect(screen.queryByLabelText('Aba Minhas denúncias')).toBeNull();
});

test('cancelar login limpa intenção; restauração não expõe telas antes de validar sessão', async () => {
  const view = render(<RootNavigator />);
  await screen.findByLabelText('Denunciar');
  fireEvent.press(screen.getByLabelText('Denunciar')); await screen.findByText('Login existente');
  fireEvent.press(screen.getByRole('button', { name: 'Cancelar login' }));
  await screen.findByText('Feed público');
  context = { ...context, user };
  view.rerender(<RootNavigator />);
  await screen.findByLabelText('Aba Minhas denúncias');
  expect(screen.queryByText('Formulário existente')).toBeNull();
  view.unmount();
  context = { ...context, user: null, restoring: true };
  const reopened = render(<RootNavigator />);
  expect(screen.getByLabelText('Restaurando sessão')).toBeTruthy();
  expect(screen.queryByText('Feed público')).toBeNull();
  context = { ...context, user, restoring: false };
  reopened.rerender(<RootNavigator />);
  await screen.findByText('Feed público');
  expect(screen.queryByText('Formulário existente')).toBeNull();
});
