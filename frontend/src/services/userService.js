import api from "../api/api"

const userService = {
  async getAll() {
    const res = await api.get("/users")
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

  async delete() {
    const res = await api.delete("/users/delete")
    return res.data
  },

  async updateAdm(id, data) {
    const res = await api.put(`/users/adm/${id}`, data)
    return res.data
  }
}
export default userService