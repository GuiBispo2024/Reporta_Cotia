import api from '../api/api';

const boardService = {
  async getBoard({ analytical = false, community = false, params = {}, signal } = {}) {
    const endpoint = analytical ? 'analytics' : community ? 'public' : 'mine';
    const response = await api.get(`/boards/${endpoint}`, { params, signal });
    return response.data;
  }
};

export default boardService;
