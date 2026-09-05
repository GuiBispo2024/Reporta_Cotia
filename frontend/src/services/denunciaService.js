import api from "../api/api";

const denunciaService = {
  async create(data) {
    const res = await api.post("/denuncia", data);
    return res.data;
  },
  async moderar(id, data) {
    const res = await api.patch(`/denuncia/${id}/moderar`, data);
    return res.data;
  },
  async revisarCensura(id, field, manterCensura) {
    const res = await api.patch(`/denuncia/${id}/censura`, { field, manterCensura });
    return res.data;
  },
  async atualizarResolucao(id, resolucaoStatus, details = {}) {
    const res = await api.patch(`/denuncia/${id}/resolucao`, { resolucaoStatus, ...details });
    return res.data;
  },
  async listarTodas(params = {}) {
    const res = await api.get("/denuncia", { params });
    return res.data;
  },
  async listarParaModeracao(params = {}) {
    const res = await api.get("/denuncia/moderacao", { params });
    return res.data;
  },
  async filtrar(params = {}) {
    const res = await api.get("/denuncia", { params });
    return res.data;
  },
  async buscarPorId(id) {
    const res = await api.get(`/denuncia/${id}`);
    return res.data;
  },
  async buscarHistorico(id) {
    const res = await api.get(`/denuncia/${id}/historico`);
    return res.data;
  },
  async buscarPorUsuario(userId) {
    const res = await api.get(`/denuncia/user/${userId}`);
    return res.data;
  },
  async buscarPublicadasPorUsuario(userId, params = {}) {
    const res = await api.get(`/denuncia/public/user/${userId}`, { params });
    return res.data;
  },
  async atualizar(id, data) {
    const res = await api.put(`/denuncia/${id}`, data);
    return res.data;
  },
  async deletar(id) {
    const res = await api.delete(`/denuncia/${id}`);
    return res.data;
  }
};

export default denunciaService;
