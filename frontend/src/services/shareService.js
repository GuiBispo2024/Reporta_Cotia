import api from "../api/api"

const shareService = {
  async compartilhar(denunciaId, data) {
    const res = await api.post(`/denuncia/${denunciaId}/share`, data)
    return res.data
  },

  async listarPorDenuncia(denunciaId) {
    const res = await api.get(`/denuncia/${denunciaId}/shares`)
    return res.data
  },

  async deletar(id) {
    const res = await api.delete(`/denuncia/share/${id}`)
    return res.data
  }
}

export default shareService