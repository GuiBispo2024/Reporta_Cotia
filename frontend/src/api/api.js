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
    if (error.response?.status === 401) {
      logoutOnExpire(); // faz logout automático + redireciona
    }
    return Promise.reject(error);
  }
);

export default api;