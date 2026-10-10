import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';

export type User = { id: number; username: string; email: string; permissions: string[] };
export type AccountUpdate = { username: string; email: string; senhaAtual?: string; novaSenha?: string };
export async function deleteAccount(client: AxiosInstance, senhaAtual: string) {
  await client.delete('users/delete', { data: { senhaAtual } });
}
export type Session = { token: string; refreshToken: string; user: User; sessionId: string; expiresAt: string; idleExpiresAt: string; sessionExpiresAt: string };
export function parseUser(data: unknown): User {
  const value = data as Partial<User> | null;
  if (!value || !Number.isInteger(value.id) || typeof value.username !== 'string'
    || typeof value.email !== 'string' || !Array.isArray(value.permissions)
    || !value.permissions.every((permission) => typeof permission === 'string')) {
    throw new ApiError('Resposta de conta inválida. Tente novamente.', 'INVALID_RESPONSE');
  }
  return { id: value.id as number, username: value.username, email: value.email, permissions: value.permissions };
}
export function parseSession(data: unknown): Session {
  const value = data as Partial<Session> | null;
  if (!value || typeof value.token !== 'string' || !value.token || typeof value.refreshToken !== 'string' || !/^[a-f0-9]{64}$/.test(value.refreshToken)
    || typeof value.sessionId !== 'string' || !['expiresAt', 'idleExpiresAt', 'sessionExpiresAt'].every((key) => Number.isFinite(Date.parse((value as Record<string, unknown>)[key] as string)))) {
    throw new ApiError('Resposta de login inválida. Tente novamente.', 'INVALID_RESPONSE');
  }
  return { ...value, user: parseUser(value.user) } as Session;
}
export async function login(client: AxiosInstance, email: string, password: string): Promise<Session> {
  const { data } = await client.post('users/login', { email: email.trim().toLowerCase(), password });
  return parseSession(data);
}
export async function register(client: AxiosInstance, username: string, email: string, password: string) {
  await client.post('users', { username: username.trim(), email: email.trim().toLowerCase(), password });
}
export async function getMe(client: AxiosInstance): Promise<User> {
  const { data } = await client.get('users/me');
  return parseUser(data);
}
