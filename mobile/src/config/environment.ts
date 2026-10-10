import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type AppEnvironment = 'development' | 'staging' | 'production';
export type Environment = Readonly<{
  appEnv: AppEnvironment;
  apiBaseUrl: string;
  apiTimeoutMs: number;
}>;

export function readEnvironment(extra: unknown, platform: string): Environment {
  if (!extra || typeof extra !== 'object') throw new Error('Configuração de ambiente ausente.');
  const value = extra as Record<string, unknown>;
  if (value.appEnv !== 'development' && value.appEnv !== 'staging' && value.appEnv !== 'production') {
    throw new Error('Ambiente inválido.');
  }
  if (typeof value.apiBaseUrl !== 'string' || typeof value.apiTimeoutMs !== 'number'
    || !Number.isInteger(value.apiTimeoutMs) || value.apiTimeoutMs < 1000 || value.apiTimeoutMs > 120000) {
    throw new Error('Configuração da API inválida.');
  }
  const url = new URL(value.apiBaseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
    || (value.appEnv !== 'development' && url.protocol !== 'https:')) {
    throw new Error('URL da API inválida para este ambiente.');
  }
  if (value.appEnv === 'development' && platform === 'android'
    && ['localhost', '127.0.0.1'].includes(url.hostname)) {
    url.hostname = '10.0.2.2';
  }
  return Object.freeze({
    appEnv: value.appEnv,
    apiBaseUrl: url.toString().replace(/\/+$/, ''),
    apiTimeoutMs: value.apiTimeoutMs,
  });
}

export function getEnvironment(): Environment {
  return readEnvironment(Constants.expoConfig?.extra, Platform.OS);
}
