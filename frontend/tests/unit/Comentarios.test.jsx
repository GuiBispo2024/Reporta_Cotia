import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Comentarios from '../../src/components/Comentarios';
import { AuthContext } from '../../src/context/authContext';
import commentService from '../../src/services/commentService';

jest.mock('../../src/services/commentService', () => ({
  __esModule: true,
  default: { listarPorDenuncia: jest.fn(), create: jest.fn() }
}));
jest.mock('../../src/context/authContext', () => ({ AuthContext: require('react').createContext() }));
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });

const comments = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1, userId: 2, comentario: `Principal ${index + 1}`,
  User: { username: 'Maria' }, createdAt: '2026-09-20T12:00:00Z',
  Replies: index ? [] : [{ id: 10, userId: 3, comentario: 'Resposta existente', User: { username: 'João' }, createdAt: '2026-09-20T13:00:00Z' }]
}));

beforeEach(() => {
  jest.clearAllMocks();
  commentService.listarPorDenuncia.mockResolvedValue({ comments, totalComments: 6 });
  commentService.create.mockResolvedValue({});
});

function setup(props = {}) {
  return render(<AuthContext.Provider value={{ user: { id: 1, username: 'Ana' } }}><Comentarios denunciaId={42} {...props} /></AuthContext.Provider>);
}

test('feed abre carrossel sem limite de três, sem respostas e com link aos detalhes', async () => {
  setup({ preview: true });
  expect(commentService.listarPorDenuncia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Comentários/ }));
  expect(await screen.findByText('Principal 5')).toBeInTheDocument();
  expect(screen.queryByText('Resposta existente')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument();
  expect(screen.queryByText('Conversa')).not.toBeInTheDocument();
  expect(screen.getByPlaceholderText('Escreva um comentário...')).toHaveAttribute('rows', '1');
  expect(screen.getByRole('link', { name: /Ver todos/ })).toHaveAttribute('href', '/denuncia/42#comentarios');
  expect(commentService.listarPorDenuncia).toHaveBeenCalledWith(42, { sort: 'newest' });
  const carousel = screen.getByRole('region', { name: /Carrossel/ });
  carousel.scrollBy = jest.fn();
  Object.defineProperty(carousel, 'clientWidth', { value: 300 });
  fireEvent.click(screen.getByRole('button', { name: 'Próximos comentários' }));
  expect(carousel.scrollBy).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' });
});

test('permite abrir e responder uma conversa com cinco níveis de respostas', async () => {
  let thread = { id: 25, comentario: 'Resposta profunda', User: { username: 'Pedro' }, createdAt: '2026-09-20', Replies: [] };
  for (let id = 24; id >= 20; id -= 1) {
    thread = { id, comentario: `Nível ${id}`, User: { username: 'Maria' }, createdAt: '2026-09-20', Replies: [thread] };
  }
  commentService.listarPorDenuncia.mockResolvedValue({ comments: [thread], totalComments: 6 });
  setup({ initiallyOpen: true });
  await screen.findByText('Nível 20');
  for (let level = 0; level < 5; level += 1) fireEvent.click(screen.getByRole('button', { name: '1 resposta' }));
  const leaf = screen.getByText('Resposta profunda').closest('article');
  fireEvent.click(within(leaf).getByRole('button', { name: 'Responder' }));
  fireEvent.change(screen.getByPlaceholderText('Responder a Pedro...'), { target: { value: 'Mais uma resposta' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar resposta' }));
  await waitFor(() => expect(commentService.create).toHaveBeenCalledWith(42, { comentario: 'Mais uma resposta', parentCommentId: 25 }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Publicar resposta' })).not.toBeInTheDocument());
});

test('detalhes recolhem respostas e publicam diretamente na resposta selecionada', async () => {
  setup({ initiallyOpen: true });
  const toggle = await screen.findByRole('button', { name: '1 resposta' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Resposta existente')).not.toBeInTheDocument();
  fireEvent.click(toggle);
  const reply = screen.getByText('Resposta existente').closest('article');
  fireEvent.click(within(reply).getByRole('button', { name: 'Responder' }));
  const input = screen.getByPlaceholderText('Responder a João...');
  expect(input).toHaveValue('@João ');
  fireEvent.change(input, { target: { value: '@João Concordo!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar resposta' }));
  await waitFor(() => expect(commentService.create).toHaveBeenCalledWith(42, { comentario: '@João Concordo!', parentCommentId: 10 }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Publicar resposta' })).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar respostas' }));
  expect(screen.queryByText('Resposta existente')).not.toBeInTheDocument();
});
