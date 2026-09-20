import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const report = { id: 1, titulo: 'Iluminação da praça', descricao: 'Lâmpada apagada', categoria: 'Iluminação pública', status: 'aprovada', resolucaoStatus: 'aberta', localizacao: 'Rua Central', createdAt: '2026-09-20T12:00:00Z' };
const initial = {
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
  const analytical = { ...initial, summary: { ...initial.summary, resolutionRate: 50 }, metrics: { averageModerationHours: 24, averageResolutionHours: 48, moderationSampleSize: 1, resolutionSampleSize: 1 }, trend: [{ period: '2026-09', total: 2 }], breakdown: { categories: [{ label: 'Iluminação pública', total: 2 }], sectors: [{ label: 'Defesa Civil', total: 2 }] } };
  boardService.getBoard.mockResolvedValue(analytical);
  render(<ReportBoard analytical />);
  expect(await screen.findByText('50%')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tempos médios' })).toBeInTheDocument();
  expect(screen.getByText('1 dia')).toBeInTheDocument();
  expect(screen.getByText('2 dias')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Gráficos dos indicadores' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Board analítico' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Iluminação pública' } });
  fireEvent.change(screen.getByLabelText('Setor responsável'), { target: { value: 'Defesa Civil' } });
  fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-01-01' } });
  fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-01-31' } });
  expect(screen.getByLabelText('Data inicial')).toHaveAttribute('max', '2026-01-31');
  expect(screen.getByLabelText('Data final')).toHaveAttribute('min', '2026-01-01');
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(boardService.getBoard).toHaveBeenLastCalledWith(expect.objectContaining({ analytical: true, params: { categoria: 'Iluminação pública', setorResponsavel: 'Defesa Civil', dataInicio: '2026-01-01', dataFim: '2026-01-31' } })));
  fireEvent.click(await screen.findByRole('button', { name: 'Carregar mais: Abertas' }));
  await waitFor(() => expect(boardService.getBoard).toHaveBeenLastCalledWith(expect.objectContaining({ params: { categoria: 'Iluminação pública', setorResponsavel: 'Defesa Civil', dataInicio: '2026-01-01', dataFim: '2026-01-31', column: 'aberta', page: 2 } })));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Carregar mais: Abertas' })).not.toBeDisabled());
});

test('board comunitário apresenta somente indicadores públicos e localizações', async () => {
  const community = {
    ...initial,
    summary: { ...initial.summary, pendente: 0, rejeitada: 0, resolutionRate: 25 },
    breakdown: {
      categories: [{ label: 'Iluminação pública', total: 2 }],
      sectors: [{ label: 'Serviço de Iluminação Pública', total: 2 }],
      locations: [{ label: 'Centro, Cotia', total: 2 }]
    },
    map: { points: [{ ...report, latitude: -23.6, longitude: -46.92 }], total: 1, limit: 500, truncated: false }
  };
  boardService.getBoard.mockResolvedValue(community);

  render(<ReportBoard community />);

  expect(await screen.findByRole('heading', { name: 'Board da comunidade' })).toBeInTheDocument();
  expect(screen.getByText('Denúncias por localização')).toBeInTheDocument();
  expect(screen.getByText('Centro, Cotia')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Distribuição geográfica' })).toBeInTheDocument();
  expect(screen.queryByText('Em moderação')).not.toBeInTheDocument();
  expect(screen.queryByText('Rejeitadas')).not.toBeInTheDocument();
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
  boardService.exportAnalytics.mockResolvedValue({ blob: new Blob(['csv']), filename: 'indicadores.csv' });
  const user = { permissions: ['dashboard.full.view', 'dashboard.export'] };

  render(<AuthContext.Provider value={{ user }}><ReportBoard analytical /></AuthContext.Provider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Exportar CSV' }));

  await waitFor(() => expect(boardService.exportAnalytics).toHaveBeenCalledWith({}));
  expect(createObjectURL).toHaveBeenCalled();
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:board');
  expect(await screen.findByText('Arquivo CSV gerado com os filtros aplicados.')).toBeInTheDocument();
  downloadClick.mockRestore();
});
