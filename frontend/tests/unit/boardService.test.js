import api from '../../src/api/api';
import boardService from '../../src/services/boardService';

jest.mock('../../src/api/api', () => ({
  __esModule: true,
  default: { get: jest.fn() }
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: { summary: { total: 0 } } });
});

test.each([
  [{}, '/boards/mine'],
  [{ community: true }, '/boards/public'],
  [{ analytical: true }, '/boards/analytics']
])('consulta o endpoint correspondente à visão do board', async (options, endpoint) => {
  const params = { categoria: 'Iluminação pública' };
  const signal = new AbortController().signal;

  await boardService.getBoard({ ...options, params, signal });

  expect(api.get).toHaveBeenCalledWith(endpoint, { params, signal });
});

test.each([
  [{}, '/boards/public/heatmap'],
  [{ analytical: true }, '/boards/analytics/heatmap']
])('consulta o endpoint correspondente ao mapa de calor', async (options, endpoint) => {
  const params = { categoria: 'Iluminação pública', dataInicio: '2026-01-01' };
  const signal = new AbortController().signal;

  await boardService.getHeatmap({ ...options, params, signal });

  expect(api.get).toHaveBeenCalledWith(endpoint, { params, signal });
});

test('solicita a exportação analítica em XLSX e preserva o nome do arquivo', async () => {
  const blob = new Blob(['dados'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  api.get.mockResolvedValueOnce({
    data: blob,
    headers: { 'content-disposition': 'attachment; filename="indicadores.xlsx"' }
  });

  await expect(boardService.exportAnalytics({ categoria: 'Iluminação pública' })).resolves.toEqual({
    blob,
    filename: 'indicadores.xlsx'
  });
  expect(api.get).toHaveBeenCalledWith('/boards/analytics/export', {
    params: { categoria: 'Iluminação pública' },
    responseType: 'blob'
  });
});

test('consulta o histórico paginado de exportações', async () => {
  const result = { data: [], total: 0, page: 1, totalPages: 0 };
  api.get.mockResolvedValueOnce({ data: result });
  const params = { page: 1, limit: 20, sort: 'newest' };

  await expect(boardService.getExportHistory(params)).resolves.toEqual(result);
  expect(api.get).toHaveBeenCalledWith('/boards/analytics/export-history', { params });
});
