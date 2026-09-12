import api from "../api/api"

const authService = { 
  async register(data) {
    const res = await api.post("/users", data)
    return res.data
  },

  async login(credentials) {
    try{
      const res = await api.post("/users/login", credentials)
      const { token, user } = res.data
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
      return { token, user }
    }catch(error){
      const msg = error.friendlyMessage || error.response?.data?.message || "Não foi possível entrar. Confira seus dados e tente novamente."
      throw new Error(msg)
    }
  },

  async me() {
    const res = await api.get('/users/me')
    return res.data
  },

  getUser() {
    const storedUser = localStorage.getItem("user")
    if (!storedUser) return null

    try {
      const user = JSON.parse(storedUser)
      if (!user || typeof user !== "object" || Array.isArray(user)) {
        localStorage.removeItem("user")
        return null
      }
      return user
    } catch {
      localStorage.removeItem("user")
      return null
    }
  },

  getToken() {
    return localStorage.getItem("token")
  },

  isAuthenticated() {
    return !!localStorage.getItem("token")
  },

  async logoutRemote() {
    await api.post('/users/logout')
  },

  clearSession() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }
}

export default authService
