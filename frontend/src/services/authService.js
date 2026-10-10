import api from '../api/api';
import { clearSession, endSession, getAccessToken, getSession, loginSession, refreshSession } from './sessionManager';
const authService = {
  async register(data) { return (await api.post('/users', data)).data; },
  async login(credentials) {
    try { return await loginSession(credentials); }
    catch (error) { throw new Error(error.friendlyMessage || error.response?.data?.message || error.message || 'Não foi possível entrar.'); }
  },
  async me() { return (await api.get('/users/me')).data; },
  restore: refreshSession, getUser: () => getSession()?.user ?? null, getToken: getAccessToken,
  isAuthenticated: () => !!getAccessToken(), logoutRemote: endSession, clearSession
};
export default authService;
