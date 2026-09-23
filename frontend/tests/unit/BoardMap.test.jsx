import { fireEvent, render, screen } from '@testing-library/react';
import BoardMap from '../../src/components/BoardMap';
import L from 'leaflet';

jest.mock('leaflet.heat', () => ({}));
jest.mock('leaflet', () => {
  const mapInstance = {
    fitBounds: jest.fn(),
    invalidateSize: jest.fn(),
    remove: jest.fn(),
    setView: jest.fn()
  };
  const tileLayer = { addTo: jest.fn() };
  const heatLayer = { addTo: jest.fn() };
  const zoomControl = { addTo: jest.fn() };
  return {
    __esModule: true,
    default: {
      map: jest.fn(() => mapInstance),
      tileLayer: jest.fn(() => tileLayer),
      heatLayer: jest.fn(() => heatLayer),
      control: { zoom: jest.fn(() => zoomControl) },
      latLngBounds: jest.fn(() => ({ bounds: true })),
      __mapInstance: mapInstance,
      __tileLayer: tileLayer,
      __heatLayer: heatLayer,
      __zoomControl: zoomControl
    }
  };
});

const heatmap = {
  cells: [
    { latitude: '-23.6000', longitude: '-46.9200', total: 8 },
    { latitude: '-23.6500', longitude: '-46.9700', total: 3 }
  ],
  summary: { cells: 2, representedReports: 11, maxIntensity: 8, truncated: false },
  privacy: { coordinatePrecision: 3, minimumReportsPerCell: 3 }
};

beforeEach(() => {
  jest.clearAllMocks();
  window.matchMedia = jest.fn(() => ({ matches: true }));
  L.map.mockReturnValue(L.__mapInstance);
  L.tileLayer.mockReturnValue(L.__tileLayer);
  L.heatLayer.mockReturnValue(L.__heatLayer);
  L.control.zoom.mockReturnValue(L.__zoomControl);
  L.latLngBounds.mockReturnValue({ bounds: true });
});

test('renderiza células agregadas em uma camada de calor interativa', () => {
  render(<BoardMap heatmap={heatmap} />);

  expect(screen.getByRole('region', { name: 'Mapa de calor interativo das denúncias' })).toBeInTheDocument();
  expect(L.tileLayer).toHaveBeenCalledWith(expect.stringContaining('openstreetmap.org'), expect.any(Object));
  expect(L.map).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({
    keyboard: true,
    scrollWheelZoom: false,
    zoomAnimation: false
  }));
  expect(L.control.zoom).toHaveBeenCalledWith(expect.objectContaining({
    zoomInTitle: 'Aproximar',
    zoomOutTitle: 'Afastar'
  }));
  expect(L.heatLayer).toHaveBeenCalledWith([
    [-23.6, -46.92, 8],
    [-23.65, -46.97, 3]
  ], expect.objectContaining({ max: 8, radius: 32 }));
  expect(L.__mapInstance.fitBounds).toHaveBeenCalled();
  expect(screen.getByText('11 denúncias representadas')).toBeInTheDocument();
  expect(screen.getByLabelText('Intensidade das concentrações')).toBeInTheDocument();
  expect(screen.getByText(/use os botões de zoom/i)).toBeInTheDocument();
  expect(screen.getByText('O mapa apresenta 2 regiões de concentração.')).toBeInTheDocument();
  fireEvent(window, new Event('resize'));
  expect(L.__mapInstance.invalidateSize).toHaveBeenCalledWith({ pan: false });
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('enquadra uma célula e explica quando o resultado foi limitado', () => {
  render(<BoardMap heatmap={{
    ...heatmap,
    cells: [heatmap.cells[0]],
    summary: { cells: 1, representedReports: 8, maxIntensity: 8, truncated: true }
  }} />);

  expect(L.__mapInstance.setView).toHaveBeenCalledWith([-23.6, -46.92], 14);
  expect(screen.getByText(/regiões mais intensas estão visíveis/i)).toBeInTheDocument();
});

test('informa quando nenhuma célula atende à regra de privacidade', () => {
  render(<BoardMap heatmap={{ ...heatmap, cells: [], summary: { cells: 0, representedReports: 0, maxIntensity: 0, truncated: false } }} />);

  expect(screen.getByText(/mínimo de 3 denúncias/i)).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: /mapa de calor interativo/i })).not.toBeInTheDocument();
});

test('apresenta carregamento e permite tentar novamente após erro', () => {
  const onRetry = jest.fn();
  const { rerender } = render(<BoardMap loading />);
  expect(screen.getByRole('status')).toHaveTextContent('Carregando concentrações geográficas');

  rerender(<BoardMap error="Não foi possível carregar o mapa de calor." onRetry={onRetry} />);
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(onRetry).toHaveBeenCalled();
});
