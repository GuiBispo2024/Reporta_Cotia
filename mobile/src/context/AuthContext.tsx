import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getEnvironment } from '../config/environment';
import { createHttpClient } from '../services/httpClient';
import { getMe, login, parseSession, type Session, type User } from '../services/authService';
import { toApiError } from '../utils/ApiError';

type Auth = { user: User | null; client: AxiosInstance; restoring: boolean; notice: string;
  signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const environment = useMemo(getEnvironment, []);
  const storageKey = `reporta-session-${environment.appEnv}`;
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState('');
  const client = useMemo(() => {
    const instance = createHttpClient(environment);
    if (session) instance.defaults.headers.common.Authorization = `Bearer ${session.token}`;
    return instance;
  }, [environment, session]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(storageKey);
        if (!stored) return;
        const cached = JSON.parse(stored) as { apiBaseUrl?: string; session?: unknown };
        if (cached.apiBaseUrl !== environment.apiBaseUrl) {
          await SecureStore.deleteItemAsync(storageKey);
          return;
        }
        const restored = parseSession(cached.session);
        const instance = createHttpClient(environment);
        instance.defaults.headers.common.Authorization = `Bearer ${restored.token}`;
        const user = await getMe(instance);
        if (active) setSession({ ...restored, user });
      } catch (error) {
        if (active) setNotice('Não foi possível restaurar sua sessão. Entre novamente.');
        if (toApiError(error).status === 401) await SecureStore.deleteItemAsync(storageKey).catch(() => {});
      } finally { if (active) setRestoring(false); }
    })();
    return () => { active = false; };
  }, [environment, storageKey]);

  useEffect(() => {
    let active = true;
    const interceptor = client.interceptors.response.use(undefined, (error: unknown) => {
      if (active && session && toApiError(error).status === 401) {
        setSession(null);
        setNotice('Sua sessão expirou. Entre novamente para publicar.');
        void SecureStore.deleteItemAsync(storageKey).catch(() => {});
      }
      return Promise.reject(error);
    });
    return () => { active = false; client.interceptors.response.eject(interceptor); };
  }, [client, session, storageKey]);

  async function signIn(email: string, password: string) {
    const next = await login(createHttpClient(environment), email, password);
    await SecureStore.setItemAsync(storageKey, JSON.stringify({ apiBaseUrl: environment.apiBaseUrl, session: next }));
    setSession(next);
    setNotice('');
  }
  async function signOut() {
    // Revogação no servidor é best effort quando o celular está offline.
    await client.post('users/logout').catch(() => {});
    await SecureStore.deleteItemAsync(storageKey);
    setSession(null);
    setNotice('');
  }
  return <Context.Provider value={{ user: session?.user ?? null, client, restoring, notice, signIn, signOut }}>{children}</Context.Provider>;
}
export function useAuth(): Auth {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider ausente.');
  return value;
}
