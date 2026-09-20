import api from '../api/api';

const boardService = {
  async getBoard({ analytical = false, params = {}, signal } = {}) {
    const response = await api.get(`/boards/${analytical ? 'analytics' : 'mine'}`, { params, signal });
    return response.data;
  }
};

export default boardService;
