import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { CommunityScreen } from '../src/screens/CommunityScreen';
import { useAuth } from '../src/context/AuthContext';
import { getCommunity, type Community } from '../src/services/communityService';
import { getDevicePosition } from '../src/services/locationService';
import { ApiError } from '../src/utils/ApiError';
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/communityService', () => ({ getCommunity: jest.fn() }));
jest.mock('../src/services/locationService', () => ({ getDevicePosition: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'storeClient' } }));
jest.mock('react-native-maps', () => {
  const React = require('react');
  return { __esModule: true, default: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimate }));
    return React.createElement('MapView', props, props.children);
  }), Marker: 'Marker', PROVIDER_GOOGLE: 'google' };
});
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useFocusEffect: (callback: () => (() => void)) => require('react').useEffect(callback, [callback]) }));
const point = { id: 1, titulo: 'Buraco', categoria: 'Outros', status: 'aprovada' as const, resolucaoStatus: 'aberta', latitude: -23.61, longitude: -46.92 };
const data: Community = { summary: { total: 3, em_andamento: 1, resolvida: 1 }, categories: [{ label: 'Outros', total: 3 }], points: [point, { ...point, id: 2, titulo: 'Outra ocorrência' }], total: 2, limit: 500, truncated: false, invalidPoints: 0 };
const navigation = { navigate: jest.fn() };
const mockAnimate = jest.fn();
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useAuth).mockReturnValue({ client: {} as any, user: null } as any);
  jest.mocked(getCommunity).mockResolvedValue(data);
});
test('visitante vê indicadores e pontos agrupados, seleciona região e abre detalhe sem pedir GPS', async () => {
  render(<CommunityScreen navigation={navigation} />);
  await screen.findByLabelText('Denúncias públicas: 3');
  const markers = screen.UNSAFE_getAllByType('Marker' as any); expect(markers).toHaveLength(1);
  fireEvent(markers[0]!, 'press');
  expect(screen.getByText('Ocorrências da região selecionada')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Ver ocorrência #1' }));
  expect(navigation.navigate).toHaveBeenCalledWith('ReportDetail', { id: 1 });
  expect(getDevicePosition).not.toHaveBeenCalled(); expect(getCommunity).toHaveBeenCalledTimes(1);
});
test('filtros consultam servidor somente ao aplicar e movimento do mapa não recarrega', async () => {
  render(<CommunityScreen navigation={navigation} />); await screen.findByLabelText('Denúncias públicas: 3');
  fireEvent.press(screen.getByRole('radio', { name: 'Categoria: Iluminação pública' }));
  fireEvent.press(screen.getByRole('radio', { name: 'Situação: Resolvida' }));
  expect(getCommunity).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Aplicar filtros do mapa' }));
  await screen.findByLabelText('Denúncias públicas: 3');
  expect(getCommunity).toHaveBeenLastCalledWith(expect.anything(), { categoria: 'Iluminação pública', resolucaoStatus: 'resolvida' }, expect.anything());
  fireEvent(screen.getByLabelText('Mapa comunitário de Cotia'), 'regionChangeComplete', { latitude: 0, longitude: 0 });
  expect(getCommunity).toHaveBeenCalledTimes(2);
});
test('GPS negado mantém mapa/lista funcionais e não dispara nova consulta', async () => {
  jest.mocked(getDevicePosition).mockRejectedValue(new ApiError('Permissão negada', 'PERMISSION_DENIED'));
  render(<CommunityScreen navigation={navigation} />); await screen.findByLabelText('Denúncias públicas: 3');
  fireEvent.press(screen.getByRole('button', { name: 'Centralizar na minha localização' }));
  await screen.findByText('Permissão negada');
  expect(screen.getByRole('button', { name: 'Ver ocorrência #1' })).toBeTruthy(); expect(getCommunity).toHaveBeenCalledTimes(1);
});
test('GPS autorizado centraliza localmente sem enviar coordenadas à consulta comunitária', async () => {
  jest.mocked(getDevicePosition).mockResolvedValue({ latitude: -23.63, longitude: -46.95, accuracy: 10 } as any);
  render(<CommunityScreen navigation={navigation} />); await screen.findByLabelText('Denúncias públicas: 3');
  fireEvent.press(screen.getByRole('button', { name: 'Centralizar na minha localização' }));
  await screen.findByText(/não foi enviada à API Reporta Cotia/);
  expect(mockAnimate).toHaveBeenCalledWith({ latitude: -23.63, longitude: -46.95, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
  expect(getCommunity).toHaveBeenCalledTimes(1);
  expect(getCommunity).toHaveBeenCalledWith(expect.anything(), {}, expect.anything());
});
test('limitação de 500 é explícita; região densa renderiza um marcador e lista paginada', async () => {
  jest.mocked(getCommunity).mockResolvedValue({ ...data, summary: { total: 501, em_andamento: 1, resolvida: 1 }, categories: [{ label: 'Outros', total: 501 }], points: Array.from({ length: 500 }, (_, i) => ({ ...point, id: i + 1 })), total: 501, truncated: true });
  render(<CommunityScreen navigation={navigation} />);
  await screen.findByText(/Este mapa não contém todas as denúncias/);
  expect(screen.UNSAFE_getAllByType('Marker' as any)).toHaveLength(1);
  expect(screen.getByText('Página 1 de 42')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Ver ocorrência #13' })).toBeNull();
});
test('sem coordenadas válidas informa ausência sem apagar indicadores e permite atualizar', async () => {
  jest.mocked(getCommunity).mockResolvedValue({ ...data, points: [], total: 0 });
  render(<CommunityScreen navigation={navigation} />);
  await screen.findByText('Nenhuma ocorrência com coordenadas válidas neste recorte.');
  expect(screen.getByLabelText('Denúncias públicas: 3')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Atualizar comunidade' }));
  await screen.findByText('Nenhuma ocorrência com coordenadas válidas neste recorte.');
  expect(getCommunity).toHaveBeenCalledTimes(2);
});
test('erro permite retry manual e resposta tardia é ignorada após desmontar', async () => {
  jest.mocked(getCommunity).mockRejectedValueOnce(new ApiError('Sem rede', 'NETWORK_ERROR')).mockResolvedValue(data);
  const view = render(<CommunityScreen navigation={navigation} />);
  await screen.findByText('Sem rede');
  fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente a comunidade' }));
  await screen.findByLabelText('Denúncias públicas: 3');
  let complete!: (value: Community) => void;
  jest.mocked(getCommunity).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  fireEvent.press(screen.getByRole('button', { name: 'Atualizar comunidade' }));
  const signal = jest.mocked(getCommunity).mock.calls.at(-1)?.[2];
  view.unmount(); expect(signal?.aborted).toBe(true);
  await act(async () => { complete(data); });
});
