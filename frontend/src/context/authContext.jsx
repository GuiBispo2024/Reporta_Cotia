import { createContext, useCallback, useEffect, useState } from 'react';
import authService from '../services/authService';
import { acceptSession, clearSession, endSession, flushActivity, getSession, markActivity, remainingSeconds, sessionNotice, subscribeSession, syncTab } from '../services/sessionManager';
export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(getSession());
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState(remainingSeconds());
  const refreshUser = useCallback(async () => {
    const original = getSession(); if (!original) return null;
    try { const user = await authService.me(); if (getSession()?.sessionId === original.sessionId) acceptSession({ ...getSession(), user }); return user; }
    catch (error) { if (error.response?.status === 401) clearSession('expired'); return null; }
  }, []);
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSession((value) => { if (active) { setSession(value); setRemaining(remainingSeconds()); } });
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* Pode estar desabilitado. */ }
    void authService.restore().catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    const interact = (event) => { if (!event.isTrusted || document.visibilityState === 'hidden') return; markActivity(); void flushActivity().catch(() => {}); setRemaining(remainingSeconds()); };
    const check = () => { setRemaining(remainingSeconds()); if (getSession() && remainingSeconds() === 0) void endSession('inactivity'); else if (document.visibilityState !== 'hidden') void flushActivity().catch(() => {}); };
    const focus = () => { check(); if (getSession()) void refreshUser(); };
    const timer = setInterval(check, 1000), events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
    events.forEach((type) => window.addEventListener(type, interact, { passive: true }));
    window.addEventListener('storage', syncTab); window.addEventListener('focus', focus); document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); events.forEach((type) => window.removeEventListener(type, interact)); window.removeEventListener('storage', syncTab); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', check); };
  }, [refreshUser]);
  async function login(credentials) { return authService.login(credentials); }
  async function logout() { await endSession(); }
  async function continueSession() { markActivity(); await flushActivity(true); setRemaining(remainingSeconds()); }
  const setUser = (value) => { const previous = getSession(); if (previous) acceptSession({ ...previous, user: typeof value === 'function' ? value(previous.user) : value }); };
  const setToken = (token) => { const previous = getSession(); if (previous) acceptSession({ ...previous, token }); };
  return <AuthContext.Provider value={{ user: session?.user ?? null, token: session?.token ?? null, isAuthenticated: !!session, loading, notice: sessionNotice(), login, logout, refreshUser, setUser, setToken, remainingSeconds: remaining, continueSession }}>{children}</AuthContext.Provider>;
};
