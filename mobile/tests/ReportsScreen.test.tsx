import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReportsScreen } from '../src/screens/ReportsScreen';
import { useAuth } from '../src/context/AuthContext';
import { listReports } from '../src/services/reportService';
import { ApiError } from '../src/utils/ApiError';
import type { RootStackParamList } from '../src/navigation/types';

jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/reportService', () => ({ listReports: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (callback: () => (() => void)) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const navigate = jest.fn();
const props = { navigation: { navigate }, route: { key: 'reports', name: 'Reports' } } as unknown as NativeStackScreenProps<RootStackParamList, 'Reports'>;
const first = { id: 1, titulo: 'Buraco', descricao: 'Descrição', localizacao: 'Rua A', bairro: '', categoria: 'Outros', status: 'aprovada', resolucaoStatus: 'aberta' };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useAuth).mockReturnValue({ client: {} as ReturnType<typeof useAuth>['client'], user: null, restoring: false, notice: '', signIn: jest.fn(), signOut: jest.fn() });
});
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
