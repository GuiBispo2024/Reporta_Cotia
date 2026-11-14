import { render, screen, waitFor } from '@testing-library/react';
import DetalheDenuncia from '../../src/pages/DetalheDenuncia';
import denunciaService from '../../src/services/denunciaService';
jest.mock('../../src/services/denunciaService', () => ({ __esModule: true, default: { buscarPorId: jest.fn(), buscarHistorico: jest.fn() } }));
jest.mock('react-router-dom', () => ({ useParams: () => ({ id: '1' }), useNavigate: () => jest.fn(), useLocation: () => ({ hash: '' }), Link: ({ to, children }) => <a href={to}>{children}</a> }), { virtual: true });
jest.mock('../../src/components/Navbar', () => () => null);
jest.mock('../../src/components/Footer', () => () => null);
jest.mock('../../src/components/ResolutionTimeline', () => () => null);
jest.mock('../../src/components/Likes', () => () => null);
jest.mock('../../src/components/Compartilhar', () => () => null);
jest.mock('../../src/components/Comentarios', () => () => null);
jest.mock('../../src/components/ImageCarousel', () => () => null);
const originalFetch = global.fetch;
const report = { id: 1, titulo: 'Ocorrência', descricao: 'Descrição', status: 'aprovada', resolucaoStatus: 'aberta', categoria: 'Outros', localizacao: 'Localização atual', latitude: -23.61, longitude: -46.92 };
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ address: { road: 'Rua da consulta', city: 'Cotia' } }) });
  denunciaService.buscarHistorico.mockResolvedValue([]);
});
afterEach(() => { global.fetch = originalFetch; });
test('projeção pública é identificada como aproximada e não é geocodificada em endereço residencial', async () => {
  denunciaService.buscarPorId.mockResolvedValue({ ...report, locationApproximate: true });
  render(<DetalheDenuncia />);
  await screen.findByText('Região aproximada para preservar a privacidade.');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.getByText('-23.61, -46.92')).toBeInTheDocument();
});
test('consulta privada conserva o comportamento de geocodificação existente', async () => {
  denunciaService.buscarPorId.mockResolvedValue(report);
  render(<DetalheDenuncia />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('lat=-23.61&lon=-46.92'), expect.any(Object)));
});
