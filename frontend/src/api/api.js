import axios from "axios";
import { API_BASE_URL, clearSession, ensureAccessToken, getSession } from '../services/sessionManager';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: { 'X-Session-Client': 'web' },
})

// Interceptor de requisição → adiciona token JWT no header
api.interceptors.request.use(async (config) => {
  const token = config.url === '/users/login' ? null : await ensureAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`
  else delete config.headers.Authorization;
  config.sessionId = getSession()?.sessionId;
  return config
})

// Interceptor de resposta → detecta token expirado (401)
api.interceptors.response.use(
  (response) => {
    if (response.config.sessionId && response.config.sessionId !== getSession()?.sessionId) return Promise.reject(new Error('A sessão mudou durante a requisição.'));
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    const isLoginRequest = originalRequest?.url?.includes("/login");

    if (!error.response) {
      error.friendlyMessage = "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
      return Promise.reject(error);
    }

    if (error.response.status === 429) {
      const retryAfter = error.response.headers?.["retry-after"];
      error.response.data = {
        ...error.response.data,
        message: retryAfter
          ? `Muitas atualizações em sequência. Aguarde ${retryAfter} segundos antes de tentar novamente.`
          : "Muitas atualizações em sequência. Aguarde alguns instantes e tente novamente."
      };
    }

    if (error.response.status >= 500) {
      error.response.data = {
        ...error.response.data,
        message: "Não conseguimos concluir a operação agora. Tente novamente em alguns instantes."
      };
    }

    // Se der 401 em qualquer outra rota → sessão expirada
    if (error.response?.status === 401 && !isLoginRequest) {
      if (originalRequest?.sessionId && originalRequest.sessionId !== getSession()?.sessionId) return Promise.reject(error);
      if (error.response.data?.code === 'SESSION_EXPIRED' && !originalRequest?.retried && getSession()) {
        try { await ensureAccessToken(true); return api({ ...originalRequest, retried: true }); }
        catch (refreshError) { return Promise.reject(refreshError); }
      }
      clearSession('expired');
    }
    return Promise.reject(error);
  }
);

export default api;
