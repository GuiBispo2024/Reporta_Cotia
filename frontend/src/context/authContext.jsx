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
    return { token, user }
    }

    const logout = () => {
        authService.logout()
        setUser(null)
        setToken(null)
    }

    const isAuthenticated = !!token

    useEffect(() => {
        if (user) {
            localStorage.setItem("user", JSON.stringify(user));
        }
    }, [user]);

    useEffect(() => {
        if (token) {
            localStorage.setItem("token", token);
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`
        } else {
            delete api.defaults.headers.common["Authorization"]
        }
    }, [token])

    return (
        <AuthContext.Provider value={{ user, setUser, token, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}