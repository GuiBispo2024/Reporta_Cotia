import axios, { type AxiosInstance } from 'axios';
import { getEnvironment, type Environment } from '../config/environment';
import { toApiError } from '../utils/ApiError';

export function createHttpClient(environment: Environment): AxiosInstance {
  const client = axios.create({
    baseURL: `${environment.apiBaseUrl}/`,
    timeout: environment.apiTimeoutMs,
    headers: { Accept: 'application/json' },
  });
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isCancel(error)) return Promise.reject(error);
      const normalized = toApiError(error);
      if (axios.isAxiosError(error)) normalized.request = error.config;
      return Promise.reject(normalized);
    },
  );
  return client;
}

let client: AxiosInstance | undefined;
export function getHttpClient(): AxiosInstance {
  client ??= createHttpClient(getEnvironment());
  return client;
}
