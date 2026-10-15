import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../src/screens/AccountScreen';
import { CreateReportScreen } from '../src/screens/CreateReportScreen';
import { useAuth } from '../src/context/AuthContext';
import { register } from '../src/services/authService';
import { createReport, updateReport } from '../src/services/reportService';
import { getCurrentLocation } from '../src/services/locationService';
import { ApiError } from '../src/utils/ApiError';
import type { RootStackParamList } from '../src/navigation/types';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/useReportDraft', () => ({ useReportDraft: (_api: string, _user: number, content: unknown) => ({ ready: true, notice: '', flush: async () => {}, discard: async () => {}, prepareSubmission: async () => ({ ...(content as object), submissionKey: 'key' }), releaseSubmission: async () => {} }) }));
jest.mock('../src/services/photoService', () => ({ selectPhotos: jest.fn() }));
jest.mock('../src/components/ReportImages', () => ({ ReportImages: () => null }));
jest.mock('../src/services/locationService', () => ({ ...jest.requireActual('../src/services/locationService'), getCurrentLocation: jest.fn() }));
jest.mock('../src/services/authService', () => ({ register: jest.fn() }));
jest.mock('../src/services/reportService', () => ({
  ...jest.requireActual('../src/services/reportService'), createReport: jest.fn(), updateReport: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const signIn = jest.fn();
const navigation = { replace: jest.fn(), popToTop: jest.fn() };
const accountProps = (name: 'Login' | 'Register') => ({ navigation, route: { key: name, name } }) as unknown as NativeStackScreenProps<RootStackParamList, 'Login' | 'Register'>;
const createProps = { navigation, route: { key: 'create', name: 'CreateReport' } } as unknown as NativeStackScreenProps<RootStackParamList, 'CreateReport'>;
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useAuth).mockReturnValue({ client: {} as ReturnType<typeof useAuth>['client'], user: { id: 1, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] }, restoring: false, notice: '', signIn, signOut: jest.fn(), updateAccount: jest.fn(), reloadProfile: jest.fn() });
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
test('GPS preenche coordenadas sem sobrescrever o endereço informado', async () => {
  jest.mocked(getCurrentLocation).mockResolvedValue({ latitude: -23.6, longitude: -46.9, address: 'Endereço sugerido', neighborhood: 'Centro', accuracy: 10 });
  render(<CreateReportScreen {...createProps} />);
  fireEvent.changeText(screen.getByLabelText('Endereço / localização'), 'Endereço confirmado');
  fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
  await screen.findByText(/Localização obtida/);
  expect(screen.getByLabelText('Endereço / localização').props.value).toBe('Endereço confirmado');
  expect(screen.getByLabelText('Latitude (opcional)').props.value).toBe('-23.6');
  fireEvent.press(screen.getByRole('button', { name: 'Remover coordenadas' }));
  expect(screen.getByLabelText('Latitude (opcional)').props.value).toBe('');
});
test('correção preserva protocolo e permite remover imagens e coordenadas', async () => {
  const context = jest.mocked(useAuth)();
  jest.mocked(useAuth).mockReturnValue({ ...context, user: { ...context.user!, permissions: ['denuncia.update_own'] } });
  const report = { id: 9, userId: 1, titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua', bairro: 'Centro', categoria: 'Outros', latitude: -23.6, longitude: -46.9, status: 'rejeitada', resolucaoStatus: 'aberta', motivoRejeicao: 'Informe número' };
  jest.mocked(updateReport).mockResolvedValue({ ...report, status: 'pendente' });
  render(<CreateReportScreen {...createProps} initialReport={report} />);
  expect(screen.getByLabelText('Título').props.value).toBe('Buraco');
  fireEvent.changeText(screen.getByLabelText('Endereço / localização'), 'Rua, 10');
  fireEvent.press(screen.getByRole('button', { name: 'Remover coordenadas' }));
  fireEvent.press(screen.getByRole('button', { name: 'Remover todas as fotos atuais' }));
  fireEvent.press(screen.getByRole('button', { name: 'Reenviar para moderação' }));
  await screen.findByText(/Protocolo #9/);
  expect(createReport).not.toHaveBeenCalled();
  expect(updateReport).toHaveBeenCalledWith(context.client, 9, { titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua, 10', bairro: 'Centro', categoria: 'Outros' }, [], true, expect.objectContaining({ onUploadProgress: expect.any(Function) }));
});
test('100% de upload aguarda confirmação antes de apresentar protocolo', async () => {
  let finish!: (value: any) => void;
  jest.mocked(createReport).mockImplementation(async (_client, _input, _photos, _key, transfer) => {
    transfer?.onUploadProgress?.({ loaded: 100, total: 100, bytes: 100, lengthComputable: true });
    return new Promise((resolve) => { finish = resolve; });
  });
  render(<CreateReportScreen {...createProps} />);
  fireEvent.changeText(screen.getByLabelText('Título'), 'Buraco');
  fireEvent.changeText(screen.getByLabelText('Descrição'), 'Na rua');
  fireEvent.changeText(screen.getByLabelText('Endereço / localização'), 'Rua, 10');
  fireEvent.press(screen.getByRole('button', { name: 'Enviar denúncia' }));
  await screen.findByText('Upload concluído. Aguardando confirmação do servidor…');
  expect(screen.queryByText(/Protocolo #/)).toBeNull();
  await act(async () => { finish({ id: 42 }); });
  await screen.findByText(/Protocolo #42/);
});
