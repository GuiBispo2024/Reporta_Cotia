import api from '../api/api';

const passwordResetService = {
  async solicitar(email) {
    const response = await api.post('/users/password/forgot', { email });
    return response.data;
  },
  async redefinir(token, password) {
    const response = await api.post('/users/password/reset', { token, password });
    return response.data;
  },
  async historico(params = {}) {
    const response = await api.get('/users/password/history', { params });
    return response.data;
  }
};

export default passwordResetService;
