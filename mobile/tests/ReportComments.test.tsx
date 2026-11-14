import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ReportComments } from '../src/components/ReportComments';
import { getComments, postComment, updateComment, type ReportComment } from '../src/services/commentService';
import { ApiError } from '../src/utils/ApiError';
jest.mock('../src/context/AuthContext', () => {
  const client = {}; return { useAuth: () => ({ client, user: { id: 1 } }) };
});
jest.mock('../src/services/commentService', () => ({ getComments: jest.fn(), postComment: jest.fn(), deleteComment: jest.fn(), updateComment: jest.fn() }));
const entry = { id: 1, userId: 2, comentario: 'Comentário existente', createdAt: '2026-10-15T12:00:00Z', username: 'Ana', replies: [] };
beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.restoreAllMocks());

const own = { ...entry, id: 2, userId: 1, comentario: 'Meu comentário' };
const pageWith = (comments: ReportComment[] = [own]) => ({ comments, totalComments: comments.length, page: 1, totalPages: 1 });
async function editOwn() {
  await screen.findByText('Meu comentário');
  fireEvent.press(screen.getByRole('button', { name: 'Editar comentário #2' }));
  fireEvent.changeText(screen.getByLabelText('Editar comentário'), 'Texto atualizado');
}

test('somente autor pode editar, inclusive respostas; PUT confirmado atualiza lista', async () => {
  jest.mocked(getComments).mockResolvedValueOnce(pageWith([{ ...entry, replies: [own] }]))
    .mockResolvedValue(pageWith([{ ...entry, replies: [{ ...own, comentario: 'Texto atualizado' }] }]));
  jest.mocked(updateComment).mockResolvedValue(undefined);
  render(<ReportComments reportId={9} />);
  await editOwn();
  expect(screen.queryByRole('button', { name: 'Editar comentário #1' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Salvar alteração' }));
  await screen.findByText('Comentário atualizado.');
  await screen.findByText('Texto atualizado');
  expect(updateComment).toHaveBeenCalledWith(expect.anything(), 2, 'Texto atualizado');
  expect(screen.queryByLabelText('Editar comentário')).toBeNull();
});

test('resposta perdida bloqueia reenvio até conferir a lista e confirma sem repetir PUT', async () => {
  jest.mocked(getComments).mockResolvedValueOnce(pageWith()).mockResolvedValue(pageWith([{ ...own, comentario: 'Texto atualizado' }]));
  jest.mocked(updateComment).mockRejectedValue(new ApiError('Sem rede', 'NETWORK_ERROR'));
  render(<ReportComments reportId={9} />); await editOwn();
  fireEvent.press(screen.getByRole('button', { name: 'Salvar alteração' }));
  await screen.findByText(/A edição pode ter sido salva/);
  expect(screen.getByLabelText('Editar comentário').props.value).toBe('Texto atualizado');
  expect(screen.getByLabelText('Editar comentário').props.editable).toBe(false);
  fireEvent.press(screen.getByRole('button', { name: 'Salvar alteração' }));
  expect(updateComment).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Conferir edição' }));
  await screen.findByText('Edição confirmada na lista.');
  expect(updateComment).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText('Editar comentário')).toBeNull();
});

test('consulta divergente preserva rascunho e só permite nova tentativa manual', async () => {
  jest.mocked(getComments).mockResolvedValue(pageWith());
  jest.mocked(updateComment).mockRejectedValueOnce(new ApiError('Timeout', 'TIMEOUT')).mockResolvedValue(undefined);
  render(<ReportComments reportId={9} />); await editOwn();
  fireEvent.press(screen.getByRole('button', { name: 'Salvar alteração' }));
  await screen.findByText(/A edição pode ter sido salva/);
  fireEvent.press(screen.getByRole('button', { name: 'Conferir edição' }));
  await screen.findByText(/Lista atualizada. Confira/);
  expect(screen.getByLabelText('Editar comentário').props.value).toBe('Texto atualizado');
  expect(updateComment).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Salvar alteração' }));
  await screen.findByText('Comentário atualizado.');
  expect(updateComment).toHaveBeenCalledTimes(2);
});

test('403 preserva o texto e não declara edição confirmada', async () => {
  jest.mocked(getComments).mockResolvedValue(pageWith());
  jest.mocked(updateComment).mockRejectedValue(new ApiError('Sem permissão', 'FORBIDDEN', 403));
  render(<ReportComments reportId={9} />); await editOwn();
  fireEvent.press(screen.getByRole('button', { name: 'Salvar alteração' }));
  await screen.findByText('Sem permissão');
  expect(screen.getByLabelText('Editar comentário').props.value).toBe('Texto atualizado');
  expect(screen.queryByText('Comentário atualizado.')).toBeNull();
});

test('falha de conferência preserva edição; cancelamento exige confirmação', async () => {
  jest.mocked(getComments).mockResolvedValue(pageWith());
  jest.mocked(updateComment).mockRejectedValue(new ApiError('Sem rede', 'NETWORK_ERROR'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render(<ReportComments reportId={9} />); await editOwn();
  fireEvent.press(screen.getByRole('button', { name: 'Salvar alteração' }));
  await screen.findByText(/A edição pode ter sido salva/);
  jest.mocked(getComments).mockRejectedValue(new ApiError('Consulta indisponível', 'NETWORK_ERROR'));
  fireEvent.press(screen.getByRole('button', { name: 'Conferir edição' }));
  await screen.findByText('Consulta indisponível');
  expect(screen.getByLabelText('Editar comentário').props.value).toBe('Texto atualizado');
  fireEvent.press(screen.getByRole('button', { name: 'Cancelar edição' }));
  expect(screen.getByLabelText('Editar comentário')).toBeTruthy();
  const buttons = alert.mock.calls.at(-1)?.[2];
  act(() => buttons?.find((item) => item.style === 'destructive')?.onPress?.());
  expect(screen.queryByLabelText('Editar comentário')).toBeNull();
});

test('cliques repetidos não duplicam PUT e comentário removido não confirma sucesso', async () => {
  jest.mocked(getComments).mockResolvedValueOnce(pageWith()).mockResolvedValue(pageWith([]));
  let fail!: (reason: unknown) => void;
  jest.mocked(updateComment).mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
  render(<ReportComments reportId={9} />); await editOwn();
  const save = screen.getByRole('button', { name: 'Salvar alteração' });
  fireEvent.press(save); fireEvent.press(save);
  expect(updateComment).toHaveBeenCalledTimes(1);
  await act(async () => { fail(new ApiError('Sem rede', 'NETWORK_ERROR')); });
  fireEvent.press(screen.getByRole('button', { name: 'Conferir edição' }));
  await screen.findByText(/O comentário não está nesta página/);
  expect(screen.getByLabelText('Editar comentário').props.value).toBe('Texto atualizado');
  expect(screen.getByRole('button', { name: 'Salvar alteração' }).props.accessibilityState.disabled).toBe(true);
});
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
