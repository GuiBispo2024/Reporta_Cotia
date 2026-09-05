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

    const logout = async () => {
        try { await authService.logoutRemote() } catch { /* A sessão local ainda deve ser encerrada. */ }
        finally {
            authService.clearSession()
            setUser(null)
            setToken(null)
            window.location.assign("/")
        }
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

    useEffect(() => {
        if (!token) return;

        let active = true;
        authService.me()
            .then(currentUser => {
                if (active) setUser(currentUser);
            })
            .catch((error) => {
                if (!active) return;
                // Falhas temporárias de rede ou limite não invalidam a sessão.
                // O interceptor global cuida exclusivamente de respostas 401.
                if (error.response?.status === 401) {
                    authService.clearSession();
                    setUser(null);
                    setToken(null);
                }
            });

        return () => { active = false; };
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, setUser, token, setToken, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
