import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { getComments, postComment } from '../src/services/commentService';
test('pagina comentários, preserva respostas e não propaga texto original censurado', async () => {
  const client = axios.create(), mock = new MockAdapter(client);
  const comment = { id: 1, userId: 1, comentario: '***', comentarioOriginal: 'source', createdAt: '2026-10-15T12:00:00Z', User: { username: 'Ana' }, Replies: [] };
  mock.onGet('denuncia/9/comentarios', { params: { page: 1, limit: 10, sort: 'newest' } }).reply(200, { comments: [{ ...comment, Replies: [{ ...comment, id: 2 }] }], totalComments: 2, page: 1, totalPages: 1 });
  const page = await getComments(client, 9, 1);
  expect(page.comments[0]?.replies[0]?.id).toBe(2);
  expect(JSON.stringify(page)).not.toContain('source');
  await expect(postComment(client, 9, ' ')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  mock.restore();
});
