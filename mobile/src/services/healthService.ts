import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';
import { getHttpClient } from './httpClient';

export type ApiHealth = { name: string; status: 'ok'; database: 'connected'; version?: string };

export async function getApiHealth(signal?: AbortSignal, client: AxiosInstance = getHttpClient()): Promise<ApiHealth> {
  const { data } = await client.get<unknown>('', { signal });
  if (!data || typeof data !== 'object' || !('name' in data) || typeof data.name !== 'string'
    || !('status' in data) || data.status !== 'ok' || !('database' in data) || data.database !== 'connected') {
    throw new ApiError('O serviço retornou uma resposta inesperada. Tente novamente.', 'INVALID_RESPONSE');
  }
  return {
    name: data.name, status: data.status, database: data.database,
    version: 'version' in data && typeof data.version === 'string' ? data.version : undefined,
  };
}
