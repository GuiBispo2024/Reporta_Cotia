import axios from 'axios';

export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) {
    return new ApiError('Não foi possível concluir esta operação.', 'UNEXPECTED_ERROR');
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError('O servidor demorou para responder. Tente novamente.', 'TIMEOUT');
  }
  if (!error.response) {
    return new ApiError('Não foi possível conectar. Verifique sua internet e tente novamente.', 'NETWORK_ERROR');
  }
  const { status, data } = error.response;
  const messages: Record<number, string> = {
    400: 'Revise os dados informados e tente novamente.',
    401: 'Entre na sua conta para continuar.',
    403: 'Sua conta não tem permissão para realizar esta ação.',
    404: 'O conteúdo solicitado não foi encontrado.',
    409: 'Estes dados já estão em uso.',
    429: 'Muitas ações em sequência. Aguarde alguns instantes.',
  };
  if (status >= 500) {
    return new ApiError('O serviço está temporariamente indisponível. Tente novamente.', 'SERVER_ERROR', status);
  }
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const code = typeof payload.code === 'string' ? payload.code : `HTTP_${status}`;
  const message = typeof payload.message === 'string' && payload.message.trim()
    ? payload.message : messages[status] ?? 'Não foi possível concluir esta operação.';
  return new ApiError(message, code, status);
}
