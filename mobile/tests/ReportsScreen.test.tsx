import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReportsScreen } from '../src/screens/ReportsScreen';
import { useAuth } from '../src/context/AuthContext';
import { listReports, listMyReports } from '../src/services/reportService';
import { ApiError } from '../src/utils/ApiError';
import type { RootStackParamList } from '../src/navigation/types';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/reportService', () => ({ ...jest.requireActual('../src/services/reportService'), listReports: jest.fn(), listMyReports: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => (() => void)) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const navigate = jest.fn();
const props = { navigation: { navigate }, route: { name: 'Reports' as const } };
const first = { id: 1, titulo: 'Buraco', descricao: 'Descrição', localizacao: 'Rua A', bairro: '', categoria: 'Outros', status: 'aprovada', resolucaoStatus: 'aberta' };
beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  jest.mocked(useAuth).mockReturnValue({ client: {} as ReturnType<typeof useAuth>['client'], user: null, restoring: false, notice: '', signIn: jest.fn(), signOut: jest.fn(), updateAccount: jest.fn(), reloadProfile: jest.fn() });
});
afterEach(() => { cleanup(); act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); });
test('visitante vê lista, abre detalhes e navega para a próxima página', async () => {
  jest.mocked(listReports).mockResolvedValueOnce({ data: [first], page: 1, total: 13, totalPages: 2 })
    .mockResolvedValueOnce({ data: [{ ...first, id: 2, titulo: 'Iluminação' }], page: 2, total: 13, totalPages: 2 });
  render(<ReportsScreen {...props} />);
  await screen.findByText('Buraco');
  fireEvent.press(screen.getByRole('button', { name: 'Ver denúncia: Buraco' }));
  expect(navigate).toHaveBeenCalledWith('ReportDetail', { id: 1 });
  fireEvent.press(screen.getByRole('button', { name: 'Próxima página' }));
  await screen.findByText('Iluminação');
  expect(jest.mocked(listReports).mock.calls[1]?.[1]).toBe(2);
  fireEvent.press(screen.getByRole('button', { name: 'Entrar para publicar' }));
  expect(navigate).toHaveBeenCalledWith('Login');
});
test('lista exibe falha, permite recuperação e busca volta à primeira página', async () => {
  jest.mocked(listReports).mockRejectedValueOnce(new ApiError('Sem rede', 'NETWORK_ERROR'))
    .mockResolvedValue({ data: [], page: 1, total: 0, totalPages: 0 });
  render(<ReportsScreen {...props} />);
  await screen.findByText('Sem rede');
  fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText(/Nenhuma denúncia encontrada/);
  fireEvent.changeText(screen.getByLabelText('Buscar pelo título'), 'Buraco');
  fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
  await waitFor(() => expect(listReports).toHaveBeenLastCalledWith(expect.anything(), 1, 'Buraco', expect.anything()));
});
test('minhas denúncias consulta a conta atual e mostra registros ainda privados', async () => {
  const context = jest.mocked(useAuth)();
  jest.mocked(useAuth).mockReturnValue({ ...context, user: { id: 7, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.create'] } });
  jest.mocked(listMyReports).mockResolvedValue({ data: [{ ...first, status: 'pendente' }], page: 1, total: 1, totalPages: 1 });
  const myProps = { ...props, route: { name: 'MyReports' as const } };
  render(<ReportsScreen {...myProps} />);
  await screen.findByText('Aguardando moderação');
  expect(listMyReports).toHaveBeenCalledWith(context.client, 7, 1, '', expect.anything());
  expect(listReports).not.toHaveBeenCalled();
});
test('combina filtros ao buscar e limpar restaura consulta inicial', async () => {
  jest.mocked(listReports).mockResolvedValue({ data: [], page: 1, total: 0, totalPages: 0 });
  render(<ReportsScreen {...props} />); await screen.findByText(/Nenhuma denúncia encontrada/);
  fireEvent.press(screen.getByRole('button', { name: 'Mostrar filtros' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Categoria: Iluminação pública' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Situação: Resolvida' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Ordenação: Mais antigas' }));
  fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
  await waitFor(() => expect(listReports).toHaveBeenLastCalledWith(expect.anything(), 1, '', expect.anything(), { categoria: 'Iluminação pública', resolucaoStatus: 'resolvida', sort: 'oldest' }));
  fireEvent.press(screen.getByRole('button', { name: 'Limpar filtros e busca' }));
  await waitFor(() => expect(listReports).toHaveBeenLastCalledWith(expect.anything(), 1, '', expect.anything()));
});
