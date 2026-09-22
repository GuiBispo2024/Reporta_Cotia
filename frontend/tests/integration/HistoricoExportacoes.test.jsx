import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HistoricoExportacoes from '../../src/pages/HistoricoExportacoes';
import boardService from '../../src/services/boardService';
import { AuthContext } from '../../src/context/authContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('../../src/context/authContext', () => {
  const React = require('react');
  return { AuthContext: React.createContext() };
});
jest.mock('../../src/services/boardService', () => ({
  __esModule: true,
  default: { getExportHistory: jest.fn() }
}));
jest.mock('../../src/components/Navbar', () => () => <nav>Navbar</nav>);
jest.mock('../../src/components/Footer', () => () => <footer>Footer</footer>);

const entries = [{
  id: 1,
  user: { id: 12, username: 'analista-cotia' },
  format: 'xlsx',
  filters: { categoria: 'Iluminação pública', bairro: 'Centro', dataInicio: '2026-01-01', dataFim: '2026-01-31' },
  recordCount: 18,
  createdAt: '2026-09-20T15:30:00.000Z'
}];

function renderPage() {
  render(
    <AuthContext.Provider value={{ user: { permissions: ['dashboard.audit.view'] } }}>
      <HistoricoExportacoes />
    </AuthContext.Provider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  boardService.getExportHistory.mockResolvedValue({ data: entries, total: 21, page: 1, limit: 20, totalPages: 2 });
});

test('apresenta exportações com responsável, filtros e paginação', async () => {
  renderPage();

  expect(await screen.findByText('analista-cotia')).toBeInTheDocument();
  expect(screen.getByText('Iluminação pública')).toBeInTheDocument();
  expect(screen.getByText('Centro')).toBeInTheDocument();
  expect(screen.getByText('XLSX')).toBeInTheDocument();
  expect(screen.getByText('18')).toBeInTheDocument();
  expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  expect(boardService.getExportHistory).toHaveBeenCalledWith({ page: 1, limit: 20, sort: 'newest' });
  expect(screen.queryByText(/ID 12/)).not.toBeInTheDocument();
});

test('ordena e carrega a próxima página da auditoria', async () => {
  renderPage();
  await screen.findByText('analista-cotia');

  fireEvent.change(screen.getByLabelText('Ordenar por data'), { target: { value: 'oldest' } });
  await waitFor(() => expect(boardService.getExportHistory).toHaveBeenLastCalledWith({ page: 1, limit: 20, sort: 'oldest' }));

  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  await waitFor(() => expect(boardService.getExportHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, sort: 'oldest' })));
});

test('retorna ao board analítico', async () => {
  renderPage();
  await screen.findByText('analista-cotia');
  fireEvent.click(screen.getByRole('button', { name: 'Voltar para o board analítico' }));
  expect(mockNavigate).toHaveBeenCalledWith('/boards/analitico');
});
