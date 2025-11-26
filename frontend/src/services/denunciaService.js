import api from "../api/api"

const denunciaService = {
  async create(data) {
    const res = await api.post("/denuncia", data)
    return res.data
  },

  async moderar(id, data) {
    const res = await api.patch(`/denuncia/${id}/moderar`, data)
    return res.data
  },

  async listarTodas() {
    const res = await api.get("/denuncia")
    return res.data
  },

  async filtrar(params) {
    const res = await api.get("/denuncia/filter", { params })
    return res.data
  },

  async buscarPorId(id) {
    const res = await api.get(`/denuncia/${id}`)
    return res.data
  },

  async buscarPorUsuario(userId) {
    const res = await api.get(`/denuncia/user/${userId}`)
    return res.data
  },

  async atualizar(id, data) {
    const res = await api.put(`/denuncia/${id}`, data)
    return res.data
  },

  async deletar(id) {
    const res = await api.delete(`/denuncia/${id}`)
    return res.data
  }
}

export default denunciaService