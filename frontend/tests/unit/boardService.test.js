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
