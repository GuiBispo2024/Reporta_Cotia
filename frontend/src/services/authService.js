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
      const msg = error.response?.data?.error || "Erro ao fazer login."
      throw new Error(msg)
    }
  },

  getUser() {
    const user = localStorage.getItem("user")
    return user ? JSON.parse(user) : null
  },

  getToken() {
    return localStorage.getItem("token")
  },

  isAuthenticated() {
    return !!localStorage.getItem("token")
  },

  logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  }
}

export default authService