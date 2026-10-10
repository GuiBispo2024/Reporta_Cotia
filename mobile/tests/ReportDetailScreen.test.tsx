import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReportDetailScreen } from '../src/screens/ReportDetailScreen';
import { getReport, getReportHistory } from '../src/services/reportService';
import { ApiError } from '../src/utils/ApiError';
import type { RootStackParamList } from '../src/navigation/types';
jest.mock('../src/context/AuthContext', () => {
  const client = {};
  return { useAuth: () => ({ client }) };
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
