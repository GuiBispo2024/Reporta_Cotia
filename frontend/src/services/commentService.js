import api from "../api/api"

const commentService = {
  async create(denunciaId,data) {
    const res = await api.post(`/denuncia/${denunciaId}/comentario`, data)
    return res.data
  },
  
  async listarPorDenuncia(denunciaId) {
    const res = await api.get(`/denuncia/${denunciaId}/comentarios`)
    return res.data
  },

  async atualizar(id, data) {
    const res = await api.put(`/denuncia/comentario/${id}`, data)
    return res.data
  },

  async deletar(id) {
    const res = await api.delete(`/denuncia/comentario/${id}`)
    return res.data
  }
}

export default commentService