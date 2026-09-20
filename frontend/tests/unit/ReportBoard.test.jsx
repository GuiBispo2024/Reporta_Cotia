import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportBoard from '../../src/components/ReportBoard';
import boardService from '../../src/services/boardService';

jest.mock('../../src/services/boardService', () => ({ __esModule: true, default: { getBoard: jest.fn() } }));
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
