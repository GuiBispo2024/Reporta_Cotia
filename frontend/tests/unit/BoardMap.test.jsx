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
  const pointLayer = {};
  pointLayer.addTo = jest.fn(() => pointLayer);
  pointLayer.bindTooltip = jest.fn(() => pointLayer);
  pointLayer.on = jest.fn(() => pointLayer);
  const zoomControl = { addTo: jest.fn() };
  return {
    __esModule: true,
    default: {
      map: jest.fn(() => mapInstance),
      tileLayer: jest.fn(() => tileLayer),
      heatLayer: jest.fn(() => heatLayer),
      circleMarker: jest.fn(() => pointLayer),
      control: { zoom: jest.fn(() => zoomControl) },
      latLngBounds: jest.fn(() => ({ bounds: true })),
      __mapInstance: mapInstance,
      __tileLayer: tileLayer,
      __heatLayer: heatLayer,
      __pointLayer: pointLayer,
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
  L.circleMarker.mockReturnValue(L.__pointLayer);
  L.__pointLayer.addTo.mockReturnValue(L.__pointLayer);
  L.__pointLayer.bindTooltip.mockReturnValue(L.__pointLayer);
  L.__pointLayer.on.mockReturnValue(L.__pointLayer);
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
  expect(screen.getByText('Visualização em mapa de calor com 2 regiões de concentração.')).toBeInTheDocument();
  fireEvent(window, new Event('resize'));
  expect(L.__mapInstance.invalidateSize).toHaveBeenCalledWith({ pan: false });
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('permite alternar para pontos agrupados sem expor denúncias individuais', () => {
  render(<BoardMap heatmap={heatmap} />);

  const pointsButton = screen.getByRole('button', { name: 'Pontos agrupados' });
  fireEvent.click(pointsButton);

  expect(pointsButton).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('region', { name: 'Mapa de pontos agrupados das denúncias' })).toBeInTheDocument();
  expect(L.circleMarker).toHaveBeenCalledTimes(2);
  expect(L.circleMarker).toHaveBeenNthCalledWith(1, [-23.6, -46.92], expect.objectContaining({ radius: 18 }));
  expect(L.__pointLayer.bindTooltip.mock.calls[0][0]).toHaveTextContent('8 denúncias agrupadas nesta região aproximada');
  expect(L.__pointLayer.bindTooltip.mock.calls[0][1]).toEqual({ direction: 'top' });
  expect(screen.getByText('Círculos maiores indicam mais denúncias na região')).toBeInTheDocument();
  expect(screen.getByText('Visualização em pontos agrupados com 2 regiões de concentração.')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

test('carrega denúncias sob demanda e abre os detalhes ao clicar no marcador', () => {
  const onLoadReports = jest.fn();
  const onSelectReport = jest.fn();
  const report = {
    id: 15,
    titulo: 'Buraco na via',
    descricao: 'Buraco próximo ao cruzamento',
    localizacao: 'Rua Central, Cotia - SP',
    bairro: 'Centro',
    categoria: 'Buraco em via',
    status: 'aprovada',
    resolucaoStatus: 'aberta',
    latitude: '-23.6100',
    longitude: '-46.9300'
  };
  const { rerender } = render(<BoardMap heatmap={heatmap} onLoadReports={onLoadReports} onSelectReport={onSelectReport} />);

  fireEvent.click(screen.getByRole('button', { name: 'Denúncias' }));
  expect(onLoadReports).toHaveBeenCalledTimes(1);

  rerender(<BoardMap
    heatmap={heatmap}
    reportMap={{ points: [report], total: 1, limit: 500, truncated: false }}
    onLoadReports={onLoadReports}
    onSelectReport={onSelectReport}
  />);

  expect(screen.getByRole('region', { name: 'Mapa das denúncias individuais' })).toBeInTheDocument();
  expect(L.circleMarker).toHaveBeenCalledWith([-23.61, -46.93], expect.objectContaining({
    radius: 9,
    fillColor: '#2563eb'
  }));
  const tooltip = L.__pointLayer.bindTooltip.mock.calls.at(-1)[0];
  expect(tooltip).toHaveTextContent('Buraco na via. Rua Central, Cotia - SP. Situação: Aberta');
  const markerClick = L.__pointLayer.on.mock.calls.find(([event]) => event === 'click')[1];
  markerClick();
  expect(onSelectReport).toHaveBeenCalledWith(expect.objectContaining({
    id: 15,
    columnLabel: 'Aberta'
  }));
  expect(screen.getByText(/selecione um ponto para abrir os detalhes/i)).toBeInTheDocument();
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
