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

test('solicita a exportação analítica em CSV e preserva o nome do arquivo', async () => {
  const blob = new Blob(['dados'], { type: 'text/csv' });
  api.get.mockResolvedValueOnce({
    data: blob,
    headers: { 'content-disposition': 'attachment; filename="indicadores.csv"' }
  });

  await expect(boardService.exportAnalytics({ categoria: 'Iluminação pública' })).resolves.toEqual({
    blob,
    filename: 'indicadores.csv'
  });
  expect(api.get).toHaveBeenCalledWith('/boards/analytics/export', {
    params: { categoria: 'Iluminação pública' },
    responseType: 'blob'
  });
});
