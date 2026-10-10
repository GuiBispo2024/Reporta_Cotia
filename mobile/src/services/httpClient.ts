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
    (error: unknown) => Promise.reject(axios.isCancel(error) ? error : toApiError(error)),
  );
  return client;
}

let client: AxiosInstance | undefined;
export function getHttpClient(): AxiosInstance {
  client ??= createHttpClient(getEnvironment());
  return client;
}
