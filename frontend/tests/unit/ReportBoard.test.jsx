import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ReportBoard from '../../src/components/ReportBoard';
import boardService from '../../src/services/boardService';
import { AuthContext } from '../../src/context/authContext';

jest.mock('../../src/services/boardService', () => ({ __esModule: true, default: { getBoard: jest.fn(), exportAnalytics: jest.fn() } }));
jest.mock('../../src/context/authContext', () => {
  const React = require('react');
  return { AuthContext: React.createContext(null) };
});
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../../src/components/Navbar', () => () => <nav />);
jest.mock('../../src/components/Footer', () => () => <footer />);

const report = { id: 1, titulo: 'Iluminação da praça', descricao: 'Lâmpada apagada', categoria: 'Iluminação pública', status: 'aprovada', resolucaoStatus: 'aberta', localizacao: 'Rua Central', bairro: 'Centro', createdAt: '2026-09-20T12:00:00Z' };
const initial = {
  generatedAt: '2026-09-20T15:30:00Z',
  summary: { total: 2, pendente: 0, aberta: 2, em_andamento: 0, resolvida: 0, rejeitada: 0 },
  columns: [{ key: 'aberta', label: 'Abertas', page: 1, totalPages: 2, total: 2, reports: [report] }]
};
beforeEach(() => { jest.clearAllMocks(); boardService.getBoard.mockResolvedValue(initial); });

test('board pessoal mostra os cartões e abre detalhes acessíveis', async () => {
  render(<ReportBoard />);
  const button = await screen.findByRole('button', { name: `Ver detalhes: ${report.titulo}` });
  expect(boardService.getBoard).toHaveBeenCalledWith(expect.objectContaining({ analytical: false }));
  button.focus();
  fireEvent.click(button);
  expect(screen.getByRole('dialog', { name: report.titulo })).toBeInTheDocument();
  expect(screen.getByText('Lâmpada apagada')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Abrir denúncia' })).toHaveAttribute('href', '/denuncia/1');
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(button).toHaveFocus();
});

test('carrega mais denúncias na coluna sem duplicar os cartões', async () => {
  boardService.getBoard.mockResolvedValueOnce(initial).mockResolvedValueOnce({ ...initial, columns: [{ ...initial.columns[0], page: 2, reports: [report, { ...report, id: 2, titulo: 'Outra denúncia' }] }] });
  render(<ReportBoard />);
  fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais: Abertas' }));
  expect(await screen.findByText('Outra denúncia')).toBeInTheDocument();
  expect(screen.getAllByText(report.titulo)).toHaveLength(1);
  expect(screen.getByText('Mostrando 2 de 2')).toBeInTheDocument();
  expect(boardService.getBoard).toHaveBeenLastCalledWith(expect.objectContaining({ params: { column: 'aberta', page: 2 } }));
});

test('mostra falhas e permite tentar novamente', async () => {
  boardService.getBoard.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(initial);
  render(<ReportBoard />);
  fireEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }));
  expect(await screen.findByText(report.titulo)).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});

test('board analítico aplica filtros aos indicadores e à paginação', async () => {
  const analytical = { ...initial, summary: { ...initial.summary, resolutionRate: 50 }, metrics: { averageModerationHours: 24, averageResolutionHours: 48, moderationSampleSize: 1, resolutionSampleSize: 1 }, comparison: { current: { dataInicio: '2026-01-01', dataFim: '2026-01-31', total: 2, approved: 2, resolvida: 1, rejeitada: 0, resolutionRate: 50 }, previous: { dataInicio: '2025-12-01', dataFim: '2025-12-31', total: 4, approved: 4, resolvida: 1, rejeitada: 0, resolutionRate: 25 }, changes: { totalPercent: -50, approvedPercent: -50, resolvedPercent: 0, rejectedPercent: 0, resolutionRatePoints: 25 } }, moderation: { pending: 2, approved: 8, rejected: 1, censoredReports: 2, censoredComments: 3, censoredTotal: 5, rejectionReasons: [{ label: 'Endereço insuficiente', total: 1 }] }, trend: [{ period: '2026-09', total: 2 }], categoryTrend: { periods: ['2026-09'], series: [{ label: 'Iluminação pública', total: 2, values: [2] }] }, breakdown: { categories: [{ label: 'Iluminação pública', total: 2 }], sectors: [{ label: 'Defesa Civil', total: 2 }], neighborhoods: [{ label: 'Centro', total: 2 }] } };
  boardService.getBoard.mockResolvedValue(analytical);
  render(<ReportBoard analytical />);
  expect((await screen.findAllByText('50%')).length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: 'Tempos médios' })).toBeInTheDocument();
  expect(screen.getByText('1 dia')).toBeInTheDocument();
  expect(screen.getByText('2 dias')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Gráficos dos indicadores' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Board analítico' })).toBeInTheDocument();
  const moderation = screen.getByRole('heading', { name: 'Indicadores da moderação' }).closest('section');
  expect(moderation).toHaveTextContent('Pendentes2');
  expect(moderation).toHaveTextContent('Aprovadas8');
  expect(moderation).toHaveTextContent('Rejeitadas1');
  expect(moderation).toHaveTextContent('Conteúdos censurados5');
  expect(moderation).toHaveTextContent('2 em denúncias · 3 em comentários');
  expect(moderation).toHaveTextContent('Endereço insuficiente1');
  const comparison = screen.getByRole('heading', { name: 'Comparação com o período anterior' }).closest('section');
  expect(comparison).toHaveTextContent('01/01/2026 a 31/01/2026');
  expect(comparison).toHaveTextContent('01/12/2025 a 31/12/2025');
  const totalComparison = within(comparison).getByRole('heading', { name: 'Total de denúncias' }).closest('article');
  expect(totalComparison).toHaveTextContent('2');
  expect(totalComparison).toHaveTextContent('Anterior: 4');
  expect(totalComparison).toHaveTextContent('-50%');
  expect(screen.getByRole('heading', { name: 'Evolução mensal por categoria' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Iluminação pública' } });
  fireEvent.change(screen.getByLabelText('Setor responsável'), { target: { value: 'Defesa Civil' } });
  fireEvent.change(screen.getByLabelText('Bairro'), { target: { value: 'Centro' } });
  fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-01-01' } });
  fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-01-31' } });
  expect(screen.getByLabelText('Data inicial')).toHaveAttribute('max', '2026-01-31');
  expect(screen.getByLabelText('Data final')).toHaveAttribute('min', '2026-01-01');
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(boardService.getBoard).toHaveBeenLastCalledWith(expect.objectContaining({ analytical: true, params: { categoria: 'Iluminação pública', setorResponsavel: 'Defesa Civil', bairro: 'Centro', dataInicio: '2026-01-01', dataFim: '2026-01-31' } })));
  fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais: Abertas' }));
  await waitFor(() => expect(boardService.getBoard).toHaveBeenLastCalledWith(expect.objectContaining({ params: { categoria: 'Iluminação pública', setorResponsavel: 'Defesa Civil', bairro: 'Centro', dataInicio: '2026-01-01', dataFim: '2026-01-31', column: 'aberta', page: 2 } })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Carregar mais: Abertas' })).not.toBeDisabled());
});

test('board comunitário apresenta somente indicadores públicos e localizações', async () => {
  const community = {
    ...initial,
    summary: { ...initial.summary, pendente: 0, rejeitada: 0, resolutionRate: 25 },
    breakdown: {
      categories: [{ label: 'Iluminação pública', total: 2 }],
      sectors: [{ label: 'Serviço de Iluminação Pública', total: 2 }],
      neighborhoods: [{ label: 'Centro', total: 2 }],
      locations: [{ label: 'Centro, Cotia', total: 2 }]
    },
    map: { points: [{ ...report, latitude: -23.6, longitude: -46.92 }], total: 1, limit: 500, truncated: false }
  };
  boardService.getBoard.mockResolvedValue(community);

  render(<ReportBoard community />);

  expect(await screen.findByRole('heading', { name: 'Board da comunidade' })).toBeInTheDocument();
  expect(screen.getByText(/Dados atualizados em/)).toHaveTextContent('20/09/2026 12:30');
  expect(screen.getByText('Denúncias por localização')).toBeInTheDocument();
  expect(screen.getByText('Denúncias por bairro')).toBeInTheDocument();
  expect(screen.getByText('Centro, Cotia')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Distribuição geográfica' })).toBeInTheDocument();
  expect(screen.queryByText('Em moderação')).not.toBeInTheDocument();
  expect(screen.queryByText('Rejeitadas')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Indicadores da moderação' })).not.toBeInTheDocument();
  expect(boardService.getBoard).toHaveBeenCalledWith(expect.objectContaining({ analytical: false, community: true }));
});

test('detalhes analíticos de denúncia privada não oferecem ações do autor', async () => {
  const privateReport = { ...report, status: 'rejeitada', motivoRejeicao: 'Falta informar o endereço' };
  boardService.getBoard.mockResolvedValue({ ...initial, columns: [{ ...initial.columns[0], reports: [privateReport] }] });
  render(<ReportBoard analytical />);
  fireEvent.click(await screen.findByRole('button', { name: `Ver detalhes: ${report.titulo}` }));
  expect(screen.getByText('Falta informar o endereço')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Corrigir denúncia' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Abrir denúncia' })).not.toBeInTheDocument();
});

test('permite exportar somente quando o analista possui a permissão específica', async () => {
  const createObjectURL = jest.fn(() => 'blob:board');
  const revokeObjectURL = jest.fn();
  const downloadClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
  boardService.exportAnalytics.mockResolvedValue({ blob: new Blob(['xlsx']), filename: 'indicadores.xlsx' });
  const user = { permissions: ['dashboard.full.view', 'dashboard.export'] };

  render(<AuthContext.Provider value={{ user }}><ReportBoard analytical /></AuthContext.Provider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Exportar Excel' }));

  await waitFor(() => expect(boardService.exportAnalytics).toHaveBeenCalledWith({}));
  expect(createObjectURL).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:board');
  expect(await screen.findByText('Planilha Excel gerada com os filtros aplicados.')).toBeInTheDocument();
  downloadClick.mockRestore();
});

test('exibe o acesso ao histórico de exportações somente com a permissão de auditoria', async () => {
  const user = { permissions: ['dashboard.full.view', 'dashboard.audit.view'] };

  const { rerender } = render(<AuthContext.Provider value={{ user }}><ReportBoard analytical /></AuthContext.Provider>);

  expect(await screen.findByRole('link', { name: 'Histórico de exportações' })).toHaveAttribute('href', '/administracao/historico-exportacoes');

  rerender(<AuthContext.Provider value={{ user: { permissions: ['dashboard.full.view'] } }}><ReportBoard analytical /></AuthContext.Provider>);

  expect(screen.queryByRole('link', { name: 'Histórico de exportações' })).not.toBeInTheDocument();
});
