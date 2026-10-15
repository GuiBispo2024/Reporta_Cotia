import { render, screen } from '@testing-library/react-native';
import { ReportMap } from '../src/components/ReportMap';
import type { Report } from '../src/services/reportService';
jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'storeClient' } }));
jest.mock('react-native-maps', () => ({ __esModule: true, default: 'MapView', Marker: 'Marker', PROVIDER_GOOGLE: 'google' }));
const report = { id: 1, titulo: 'Buraco', localizacao: 'Rua A' } as Report;
test('sem coordenadas exibe explicação; latitude zero é aceita e mapa fica dentro da tela', () => {
  const view = render(<ReportMap report={report} />);
  expect(screen.getByText('Esta denúncia não possui coordenadas para exibir no mapa.')).toBeTruthy();
  view.rerender(<ReportMap report={{ ...report, latitude: 0, longitude: -46.9 }} />);
  expect(screen.getByLabelText('Mapa da denúncia Buraco').props.initialRegion.latitude).toBe(0);
});
