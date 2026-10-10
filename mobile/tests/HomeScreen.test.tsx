import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { getApiHealth } from '../src/services/healthService';
import { ApiError } from '../src/utils/ApiError';
import type { RootStackParamList } from '../src/navigation/types';

jest.mock('../src/services/healthService', () => ({ getApiHealth: jest.fn() }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const health = jest.mocked(getApiHealth);
const navigate = jest.fn();
const props = { navigation: { navigate }, route: { key: 'home', name: 'Home' } } as unknown as NativeStackScreenProps<RootStackParamList, 'Home'>;

test('recupera falha de conexão e permite navegar', async () => {
  health.mockRejectedValueOnce(new ApiError('Sem conexão', 'NETWORK_ERROR'))
    .mockResolvedValueOnce({ name: 'API', status: 'ok', database: 'connected' });
  render(<HomeScreen {...props} />);
  await screen.findByText('Sem conexão');
  fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
  await screen.findByText('Tudo pronto. O serviço está disponível.');
  fireEvent.press(screen.getByRole('button', { name: 'Sobre o aplicativo' }));
  expect(navigate).toHaveBeenCalledWith('About');
});
test('cancela a requisição pendente quando a tela desmonta', async () => {
  health.mockImplementation(() => new Promise(() => {}));
  const view = render(<HomeScreen {...props} />);
  await waitFor(() => expect(health).toHaveBeenCalled());
  const signal = health.mock.calls[0]?.[0];
  view.unmount();
  expect(signal?.aborted).toBe(true);
});
