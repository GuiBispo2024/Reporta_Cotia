import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';
export type ReportComment = { id: number; comentario: string; userId: number; createdAt: string; username: string; replies: ReportComment[] };
export type CommentPage = { comments: ReportComment[]; totalComments: number; page: number; totalPages: number };
function parseComment(value: any, depth = 0): ReportComment {
  if (!value || !Number.isInteger(value.id) || !Number.isInteger(value.userId) || typeof value.comentario !== 'string'
    || typeof value.createdAt !== 'string' || depth > 20 || (value.Replies != null && !Array.isArray(value.Replies))) throw new ApiError('Resposta de comentários inválida.', 'INVALID_RESPONSE');
  return { id: value.id, comentario: value.comentario, userId: value.userId, createdAt: value.createdAt,
    username: typeof value.User?.username === 'string' ? value.User.username : 'Usuário', replies: (value.Replies ?? []).map((reply: unknown) => parseComment(reply, depth + 1)) };
}
export async function getComments(client: AxiosInstance, id: number, page: number, signal?: AbortSignal): Promise<CommentPage> {
  const { data } = await client.get(`denuncia/${id}/comentarios`, { params: { page, limit: 10, sort: 'newest' }, signal });
  if (!data || !Array.isArray(data.comments) || !Number.isInteger(data.totalComments) || !Number.isInteger(data.totalPages) || !Number.isInteger(data.page)) throw new ApiError('Lista de comentários inválida.', 'INVALID_RESPONSE');
  return { comments: data.comments.map((value: unknown) => parseComment(value)), totalComments: data.totalComments, page: data.page, totalPages: data.totalPages };
}
export async function postComment(client: AxiosInstance, id: number, text: string, parentCommentId?: number) {
  if (!text.trim() || text.trim().length > 255) throw new ApiError('Escreva um comentário de até 255 caracteres.', 'VALIDATION_ERROR');
  await client.post(`denuncia/${id}/comentario`, { comentario: text.trim(), ...(parentCommentId ? { parentCommentId } : {}) });
}
export async function deleteComment(client: AxiosInstance, id: number) { await client.delete(`denuncia/comentario/${id}`); }
