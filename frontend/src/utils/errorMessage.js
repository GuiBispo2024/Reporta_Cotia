export function friendlyError(error, fallback = 'Não foi possível concluir esta ação.') {
  if (error?.friendlyMessage) return error.friendlyMessage;

  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;

  if (!error?.response) return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
  if (status === 400) return 'Alguns dados precisam ser corrigidos. Revise os campos informados e tente novamente.';
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (status === 403) return 'Sua conta não tem permissão para realizar esta ação.';
  if (status === 404) return 'O conteúdo solicitado não foi encontrado ou não está mais disponível.';
  if (status === 409) return 'Não foi possível salvar porque esses dados já estão em uso.';
  if (status === 429) return 'Muitas ações em sequência. Aguarde alguns instantes e tente novamente.';
  if (status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente em alguns instantes.';
  return fallback;
}
