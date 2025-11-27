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

    // Se der 401 mas for no login → NÃO tratar como sessão expirada
    if (originalRequest.url.includes("/login")) {
      return Promise.reject(error);
    }

    // Se der 401 em qualquer outra rota → sessão expirada
    if (error.response?.status === 401) {
      logoutOnExpire();
    }
    return Promise.reject(error);
  }
);

export default api;