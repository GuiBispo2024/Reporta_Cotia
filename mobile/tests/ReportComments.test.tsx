import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReportComments } from '../src/components/ReportComments';
import { getComments, postComment } from '../src/services/commentService';
import { ApiError } from '../src/utils/ApiError';
jest.mock('../src/context/AuthContext', () => {
  const client = {}; return { useAuth: () => ({ client, user: { id: 1 } }) };
});
jest.mock('../src/services/commentService', () => ({ getComments: jest.fn(), postComment: jest.fn(), deleteComment: jest.fn() }));
const entry = { id: 1, userId: 2, comentario: 'Comentário existente', createdAt: '2026-10-15T12:00:00Z', username: 'Ana', replies: [] };
beforeEach(() => jest.resetAllMocks());
test('carrega automaticamente e atualiza lista depois de publicar resposta', async () => {
  jest.mocked(getComments).mockResolvedValue({ comments: [entry], totalComments: 1, page: 1, totalPages: 1 });
  jest.mocked(postComment).mockResolvedValue(undefined);
  render(<ReportComments reportId={9} />);
  await screen.findByText('Comentário existente');
  fireEvent.press(screen.getByRole('button', { name: 'Responder a Ana' }));
  fireEvent.changeText(screen.getByLabelText('Seu comentário'), 'Minha resposta');
  fireEvent.press(screen.getByRole('button', { name: 'Publicar comentário' }));
  await waitFor(() => expect(getComments).toHaveBeenCalledTimes(2));
  expect(postComment).toHaveBeenCalledWith(expect.anything(), 9, 'Minha resposta', 1);
  expect(screen.getByLabelText('Seu comentário').props.value).toBe('');
});
test('falha de publicação mantém texto e orienta conferir a lista antes de repetir', async () => {
  jest.mocked(getComments).mockResolvedValue({ comments: [], totalComments: 0, page: 1, totalPages: 0 });
  jest.mocked(postComment).mockRejectedValue(new ApiError('Sem rede', 'NETWORK_ERROR'));
  render(<ReportComments reportId={9} />); await screen.findByText('Ainda não há comentários.');
  fireEvent.changeText(screen.getByLabelText('Seu comentário'), 'Meu comentário');
  fireEvent.press(screen.getByRole('button', { name: 'Publicar comentário' }));
  await screen.findByText(/Atualize a lista antes de reenviar/);
  expect(screen.getByLabelText('Seu comentário').props.value).toBe('Meu comentário');
});
