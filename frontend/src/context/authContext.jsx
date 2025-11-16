import {createContext,useState, useEffect} from "react";
import authService from "../services/authService"
import api from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(authService.getUser());
    const [token, setToken] = useState(authService.getToken());

    const login = async (credentials) => {
    const { token, user } = await authService.login(credentials)
    setUser(user)
    setToken(token)
    }

    const logout = () => {
        authService.logout()
        setUser(null)
        setToken(null)
    }

    const isAuthenticated = !!token

    useEffect(() => {
        if (token) {
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`
        } else {
            delete api.defaults.headers.common["Authorization"]
        }
    }, [token])

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}