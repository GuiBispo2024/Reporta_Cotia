import api from "../api/api"

const likeService = {
  async curtir(denunciaId) {
    const res = await api.post(`/denuncia/${denunciaId}/like`)
    return res.data
  },

  async listarPorDenuncia(denunciaId, params = {}) {
    const res = await api.get(`/denuncia/${denunciaId}/likes`, { params })
    return res.data
  },

  async descurtir(denunciaId) {
    const res = await api.delete(`/denuncia/${denunciaId}/like`)
    return res.data
  }
}

export default likeService
