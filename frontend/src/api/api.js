import axios from "axios";
import { logoutOnExpire } from "../utils/logout";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
})

// Interceptor de requisição → adiciona token JWT no header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Interceptor de resposta → detecta token expirado (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
      logoutOnExpire();
    }
    return Promise.reject(error);
  }
);

export default api;
