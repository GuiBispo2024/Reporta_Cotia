import api from '../api/api';

const boardService = {
  async getBoard({ analytical = false, community = false, params = {}, signal } = {}) {
    const endpoint = analytical ? 'analytics' : community ? 'public' : 'mine';
    const response = await api.get(`/boards/${endpoint}`, { params, signal });
    return response.data;
  },

  async getHeatmap({ analytical = false, params = {}, signal } = {}) {
    const endpoint = analytical ? 'analytics' : 'public';
    const response = await api.get(`/boards/${endpoint}/heatmap`, { params, signal });
    return response.data;
  },

  async getMapPoints({ analytical = false, params = {}, signal } = {}) {
    const endpoint = analytical ? 'analytics' : 'public';
    const response = await api.get(`/boards/${endpoint}/map-points`, { params, signal });
    return response.data;
  },

  async exportAnalytics(params = {}) {
    const response = await api.get('/boards/analytics/export', { params, responseType: 'blob' });
    const disposition = response.headers?.['content-disposition'] || '';
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || 'reporta-cotia-denuncias.xlsx';
    return { blob: response.data, filename };
  },

  async getExportHistory(params = {}) {
    const response = await api.get('/boards/analytics/export-history', { params });
    return response.data;
  }
};

export default boardService;
