import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';
export function extractResetToken(value: string): string {
  let token = value.trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    try {
      const url = new URL(token);
      if (!['https:', 'http:', 'reportacotia:', 'reportacotia-development:', 'reportacotia-staging:'].includes(url.protocol)
        || !`${url.host}${url.pathname}`.endsWith('redefinir-senha')) throw Error('path');
      token = url.searchParams.get('token') ?? '';
    } catch { throw new ApiError('Cole o link de redefinição recebido por e-mail.', 'INVALID_RESET_TOKEN'); }
  }
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new ApiError('Link de redefinição inválido.', 'INVALID_RESET_TOKEN');
  return token;
}
export async function requestPasswordReset(client: AxiosInstance, email: string) {
  await client.post('users/password/forgot', { email: email.trim().toLowerCase() });
}
export async function resetPassword(client: AxiosInstance, link: string, password: string) {
  await client.post('users/password/reset', { token: extractResetToken(link), password });
}
