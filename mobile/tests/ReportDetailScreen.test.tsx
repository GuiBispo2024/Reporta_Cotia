import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReportDetailScreen } from '../src/screens/ReportDetailScreen';
import { getReport, getReportHistory } from '../src/services/reportService';
import { ApiError } from '../src/utils/ApiError';
import type { RootStackParamList } from '../src/navigation/types';
import { useAuth } from '../src/context/AuthContext';
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useFocusEffect: (callback: () => void) => { require('react').useEffect(callback, [callback]); } }));
jest.mock('../src/context/AuthContext', () => {
  const client = {};
  return { useAuth: jest.fn(() => ({ client })) };
});
test('somente autor com permissão pode abrir correção de uma rejeitada', async () => {
  const client = {} as ReturnType<typeof useAuth>['client'];
  jest.mocked(useAuth).mockReturnValue({ client, user: { id: 1, username: 'Ana', email: 'ana@example.org', permissions: ['denuncia.update_own'] }, restoring: false, notice: '', signIn: jest.fn(), signOut: jest.fn(), updateAccount: jest.fn(), reloadProfile: jest.fn() });
  jest.mocked(getReport).mockResolvedValue({ id: 9, userId: 1, titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua', bairro: '', categoria: 'Outros', status: 'rejeitada', resolucaoStatus: 'aberta' });
  jest.mocked(getReportHistory).mockResolvedValue([]);
  const navigate = jest.fn();
  render(<ReportDetailScreen {...props} navigation={{ ...props.navigation, navigate }} />);
  fireEvent.press(await screen.findByRole('button', { name: 'Corrigir e reenviar' }));
  expect(navigate).toHaveBeenCalledWith('EditReport', { id: 9 });
});
test('outro autor não recebe ação de correção', async () => {
  jest.mocked(useAuth).mockReturnValue({ client: {} as ReturnType<typeof useAuth>['client'], user: { id: 2, username: 'Outra', email: 'outra@example.org', permissions: ['denuncia.update_own'] }, restoring: false, notice: '', signIn: jest.fn(), signOut: jest.fn(), updateAccount: jest.fn(), reloadProfile: jest.fn() });
  jest.mocked(getReport).mockResolvedValue({ id: 9, userId: 1, titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua', bairro: '', categoria: 'Outros', status: 'rejeitada', resolucaoStatus: 'aberta' });
  jest.mocked(getReportHistory).mockResolvedValue([]);
  render(<ReportDetailScreen {...props} />);
  await screen.findByText('Protocolo #9 · Outros');
  expect(screen.queryByRole('button', { name: 'Corrigir e reenviar' })).toBeNull();
});
jest.mock('../src/components/ReportImages', () => ({ ReportImages: () => null }));
jest.mock('../src/services/reportService', () => ({ getReport: jest.fn(), getReportHistory: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const props = { navigation: {}, route: { key: 'details', name: 'ReportDetail', params: { id: 9 } } } as unknown as NativeStackScreenProps<RootStackParamList, 'ReportDetail'>;
test('detalhes mantêm motivo e setor quando histórico falha e permitem recarregá-lo', async () => {
  jest.mocked(getReport).mockResolvedValue({ id: 9, titulo: 'Buraco', descricao: 'Descrição', localizacao: 'Rua A', bairro: '', categoria: 'Outros', status: 'rejeitada', resolucaoStatus: 'aberta', motivoRejeicao: 'Informe o número', setorResponsavel: 'Infraestrutura' });
  jest.mocked(getReportHistory).mockRejectedValueOnce(new ApiError('Histórico indisponível', 'NETWORK_ERROR')).mockResolvedValueOnce([
    { id: 1, tipo: 'moderacao', statusAnterior: 'pendente', statusNovo: 'rejeitada', createdAt: '2026-10-10T12:00:00Z' },
  ]);
  render(<ReportDetailScreen {...props} />);
  await screen.findByText('Histórico indisponível');
  expect(screen.getByText('Motivo da rejeição: Informe o número')).toBeTruthy();
  expect(screen.getByText('Setor responsável: Infraestrutura')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Recarregar histórico' }));
  await screen.findByText('Moderação: Rejeitada');
});
