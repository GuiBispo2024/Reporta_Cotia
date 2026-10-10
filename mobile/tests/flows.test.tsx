import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../src/screens/AccountScreen';
import { CreateReportScreen } from '../src/screens/CreateReportScreen';
import { useAuth } from '../src/context/AuthContext';
import { register } from '../src/services/authService';
import { createReport } from '../src/services/reportService';
import { ApiError } from '../src/utils/ApiError';
import type { RootStackParamList } from '../src/navigation/types';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/photoService', () => ({ selectPhotos: jest.fn() }));
jest.mock('../src/services/authService', () => ({ register: jest.fn() }));
jest.mock('../src/services/reportService', () => ({
  ...jest.requireActual('../src/services/reportService'), createReport: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const signIn = jest.fn();
const navigation = { replace: jest.fn(), popToTop: jest.fn() };
const accountProps = (name: 'Login' | 'Register') => ({ navigation, route: { key: name, name } }) as unknown as NativeStackScreenProps<RootStackParamList, 'Login' | 'Register'>;
const createProps = { navigation, route: { key: 'create', name: 'CreateReport' } } as unknown as NativeStackScreenProps<RootStackParamList, 'CreateReport'>;
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useAuth).mockReturnValue({ client: {} as ReturnType<typeof useAuth>['client'], user: { id: 1, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] }, restoring: false, notice: '', signIn, signOut: jest.fn() });
});
test('login mantém os campos após falha e permite tentar novamente', async () => {
  signIn.mockRejectedValueOnce(new ApiError('Senha incorreta.', 'HTTP_401', 401)).mockResolvedValueOnce(undefined);
  render(<AccountScreen {...accountProps('Login')} />);
  fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@example.org');
  fireEvent.changeText(screen.getByLabelText('Senha'), '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Senha incorreta.');
  expect(screen.getByLabelText('E-mail').props.value).toBe('ana@example.org');
  fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(signIn).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' }).props.accessibilityState.busy).toBe(false));
});
test('cadastro valida confirmação e exibe confirmação somente após a API responder', async () => {
  jest.mocked(register).mockResolvedValue(undefined);
  render(<AccountScreen {...accountProps('Register')} />);
  fireEvent.changeText(screen.getByLabelText('Nome de usuário'), 'Ana');
  fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@example.org');
  fireEvent.changeText(screen.getByLabelText('Senha'), '123456');
  fireEvent.changeText(screen.getByLabelText('Confirmar senha'), '654321');
  fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
  expect(register).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Confirmar senha'), '123456');
  fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
  await screen.findByText('Conta criada. Entre para enviar sua primeira denúncia.');
  expect(register).toHaveBeenCalledTimes(1);
});
test('envio valida campos, preserva o rascunho em falha e confirma protocolo após sucesso', async () => {
  jest.mocked(createReport).mockRejectedValueOnce(new ApiError('Sem conexão', 'NETWORK_ERROR'))
    .mockResolvedValueOnce({ id: 42 } as Awaited<ReturnType<typeof createReport>>);
  render(<CreateReportScreen {...createProps} />);
  fireEvent.press(screen.getByRole('button', { name: 'Enviar denúncia' }));
  expect(createReport).not.toHaveBeenCalled();
  fireEvent.changeText(screen.getByLabelText('Título'), 'Buraco na rua');
  fireEvent.changeText(screen.getByLabelText('Descrição'), 'Buraco próximo ao ponto de ônibus.');
  fireEvent.changeText(screen.getByLabelText('Endereço / localização'), 'Rua das Flores, 10');
  fireEvent.press(screen.getByRole('button', { name: 'Enviar denúncia' }));
  await screen.findByText('Sem conexão');
  expect(screen.getByLabelText('Título').props.value).toBe('Buraco na rua');
  fireEvent.press(screen.getByRole('button', { name: 'Enviar denúncia' }));
  await screen.findByText(/Protocolo #42/);
  expect(createReport).toHaveBeenCalledTimes(2);
});
test('conta sem permissão não pode enviar denúncias', () => {
  const context = jest.mocked(useAuth)();
  jest.mocked(useAuth).mockReturnValue({ ...context, user: { ...context.user!, permissions: [] } });
  render(<CreateReportScreen {...createProps} />);
  fireEvent.press(screen.getByRole('button', { name: 'Enviar denúncia' }));
  expect(createReport).not.toHaveBeenCalled();
});
