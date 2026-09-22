import { render, screen } from '@testing-library/react';
import BoardMap from '../../src/components/BoardMap';
import L from 'leaflet';

jest.mock('leaflet', () => {
  const mapInstance = {
    fitBounds: jest.fn(),
    remove: jest.fn(),
    setView: jest.fn()
  };
  const tileLayer = { addTo: jest.fn() };
  const marker = {};
  marker.addTo = jest.fn(() => marker);
  marker.bindTooltip = jest.fn(() => marker);
  return {
    __esModule: true,
    default: {
      map: jest.fn(() => mapInstance),
      tileLayer: jest.fn(() => tileLayer),
      circleMarker: jest.fn(() => marker),
      latLngBounds: jest.fn(() => ({ bounds: true })),
      __mapInstance: mapInstance,
      __tileLayer: tileLayer,
      __marker: marker
    }
  };
});
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  L.map.mockReturnValue(L.__mapInstance);
  L.tileLayer.mockReturnValue(L.__tileLayer);
  L.circleMarker.mockReturnValue(L.__marker);
  L.latLngBounds.mockReturnValue({ bounds: true });
  L.__marker.addTo.mockReturnValue(L.__marker);
  L.__marker.bindTooltip.mockReturnValue(L.__marker);
});

const points = [
  { id: 1, titulo: 'Poste apagado', localizacao: 'Centro, Cotia', categoria: 'Iluminação pública', latitude: '-23.6000', longitude: '-46.9200', status: 'aprovada', resolucaoStatus: 'aberta' },
  { id: 2, titulo: 'Registro rejeitado', localizacao: 'Caucaia do Alto', categoria: 'Outros', latitude: '-23.6500', longitude: '-46.9700', status: 'rejeitada', resolucaoStatus: 'aberta' }
];

test('renderiza o mapa interativo e oferece link somente para denúncia pública', () => {
  render(<BoardMap map={{ points, total: 2, limit: 500, truncated: false }} />);

  expect(screen.getByRole('region', { name: 'Mapa interativo das denúncias' })).toBeInTheDocument();
  expect(L.map).toHaveBeenCalled();
  expect(L.tileLayer).toHaveBeenCalledWith(expect.stringContaining('openstreetmap.org'), expect.any(Object));
  expect(L.circleMarker).toHaveBeenCalledTimes(2);
  expect(L.__mapInstance.fitBounds).toHaveBeenCalled();
  expect(screen.getByRole('link', { name: /abrir denúncia: poste apagado/i })).toHaveAttribute('href', '/denuncia/1');
  expect(screen.getByRole('img', { name: /registro rejeitado/i })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /registro rejeitado/i })).not.toBeInTheDocument();
  expect(screen.getByText('2 pontos exibidos')).toBeInTheDocument();
});

test('explica quando o limite geográfico foi atingido', () => {
  render(<BoardMap map={{ points: [points[0]], total: 700, limit: 500, truncated: true }} />);

  expect(screen.getByText(/pontos mais recentes de 700/i)).toBeInTheDocument();
  expect(L.__mapInstance.setView).toHaveBeenCalledWith([-23.6, -46.92], 15);
});

test('mostra estado vazio quando não há coordenadas válidas', () => {
  render(<BoardMap map={{ points: [{ id: 1, latitude: null, longitude: null }], total: 0, limit: 500, truncated: false }} />);

  expect(screen.getByText(/ainda não possuem coordenadas/i)).toBeInTheDocument();
  expect(screen.queryByTitle('Mapa das denúncias do board')).not.toBeInTheDocument();
});
