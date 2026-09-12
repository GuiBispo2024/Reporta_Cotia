import {createContext, useCallback, useEffect, useRef, useState} from "react";
import authService from "../services/authService"
import api from "../api/api";

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(authService.getUser());
    const [token, setToken] = useState(authService.getToken());
    const tokenRef = useRef(token);
    tokenRef.current = token;

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

    const refreshUser = useCallback(async () => {
        const sessionToken = token;
        if (!sessionToken) return null;

        try {
            const currentUser = await authService.me();
            if (tokenRef.current === sessionToken) setUser(currentUser);
            return currentUser;
        } catch (error) {
            if (tokenRef.current === sessionToken && error.response?.status === 401) {
                authService.clearSession();
                setUser(null);
                setToken(null);
            }
            return null;
        }
    }, [token]);

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
        if (!token) return undefined;

        refreshUser();
        const refreshOnFocus = () => { refreshUser(); };
        const refreshOnVisibility = () => {
            if (document.visibilityState === 'visible') refreshUser();
        };

        window.addEventListener('focus', refreshOnFocus);
        document.addEventListener('visibilitychange', refreshOnVisibility);
        return () => {
            window.removeEventListener('focus', refreshOnFocus);
            document.removeEventListener('visibilitychange', refreshOnVisibility);
        };
    }, [refreshUser, token]);

    return (
        <AuthContext.Provider value={{ user, setUser, token, setToken, isAuthenticated, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}
