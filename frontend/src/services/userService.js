import api from "../api/api"

const userService = {
  async getAll() {
    const res = await api.get("/users")
    return res.data
  },

  async getAllWithDenunciaCount(params = {}) {
    const res = await api.get("/users", { params: { ...params, withCounts: true } })
    return res.data
  },

  async getById(id) {
    const res = await api.get(`/users/${id}`)
    return res.data
  },

  async update(data) {
    const res = await api.put(`/users/update`, data)
    return res.data
  },

  async updateAvatar(file) {
    const data = new FormData()
    data.append('avatar', file)
    const res = await api.patch('/users/avatar', data)
    return res.data
  },

  async removeAvatar() {
    const res = await api.delete('/users/avatar')
    return res.data
  },

  async delete(senhaAtual) {
    const res = await api.delete("/users/delete", { data: { senhaAtual } })
    return res.data
  },

  async getAvailableRoles() {
    const res = await api.get('/users/access/roles')
    return res.data
  },

  async getRoleHistory(params = {}) {
    const res = await api.get('/users/access/role-history', { params })
    return res.data
  },

  async updateRoles(id, roles) {
    const res = await api.put(`/users/${id}/roles`, { roles })
    return res.data
  }
}
export default userService
