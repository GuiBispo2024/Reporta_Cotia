import api from '../api/api';

const boardService = {
  async getBoard({ analytical = false, community = false, params = {}, signal } = {}) {
    const endpoint = analytical ? 'analytics' : community ? 'public' : 'mine';
    const response = await api.get(`/boards/${endpoint}`, { params, signal });
    return response.data;
  },

  async exportAnalytics(params = {}) {
    const response = await api.get('/boards/analytics/export', { params, responseType: 'blob' });
    const disposition = response.headers?.['content-disposition'] || '';
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'reporta-cotia-denuncias.xlsx';
    return { blob: response.data, filename };
  }
};

export default boardService;
