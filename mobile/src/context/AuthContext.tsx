import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Alert, AppState, View } from 'react-native';
import type { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { getEnvironment } from '../config/environment';
import { createHttpClient } from '../services/httpClient';
import { login, parseSession, parseUser, type Session, type User, type AccountUpdate } from '../services/authService';
import { ApiError, toApiError } from '../utils/ApiError';
import { SessionActivityContext } from './SessionActivityContext';

const IDLE_MS = 15 * 60 * 1000;
type Auth = { user: User | null; client: AxiosInstance; restoring: boolean; notice: string;
  signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>;
  updateAccount: (input: AccountUpdate) => Promise<void> };
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const environment = useMemo(getEnvironment, []);
  const storageKey = `reporta-refresh-${environment.appEnv}`;
  const client = useMemo(() => createHttpClient(environment), [environment]);
  const raw = useMemo(() => createHttpClient(environment), [environment]);
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState('');
  const current = useRef<Session | null>(null);
  const refreshToken = useRef<string | null>(null);
  const deadline = useRef(0), absolute = useRef(0), epoch = useRef(0);
  const refreshing = useRef<Promise<Session> | null>(null);
  const storage = useRef<Promise<unknown>>(Promise.resolve());
  const dirty = useRef(false), lastSent = useRef(0), warned = useRef(false), sending = useRef(false);
  const lastInteractionAt = useRef(0);
  const accountChange = useRef<Promise<void> | null>(null);

  function writeStorage(action: () => Promise<unknown>) {
    const pending = storage.current.then(action, action); storage.current = pending.catch(() => {}); return pending;
  }
  async function save(next: Session) {
    // Apenas a credencial de renovação vai ao disco, nunca access token ou senha.
    await writeStorage(() => SecureStore.setItemAsync(storageKey, JSON.stringify({ apiBaseUrl: environment.apiBaseUrl,
      refreshToken: next.refreshToken, sessionId: next.sessionId, idleExpiresAt: next.idleExpiresAt, sessionExpiresAt: next.sessionExpiresAt })));
  }
  function commit(next: Session) {
    const same = current.current?.sessionId === next.sessionId;
    absolute.current = Date.parse(next.sessionExpiresAt);
    deadline.current = Math.min(absolute.current, same && dirty.current ? Math.max(deadline.current, Date.parse(next.idleExpiresAt)) : Date.parse(next.idleExpiresAt));
    current.current = next; refreshToken.current = next.refreshToken; setSession(next);
    if (!same) { dirty.current = false; lastSent.current = Date.now(); warned.current = false; }
  }
  function clear(reason: string) {
    epoch.current += 1; current.current = null; refreshToken.current = null; dirty.current = false;
    setSession(null); setNotice(reason);
    void writeStorage(() => SecureStore.deleteItemAsync(storageKey)).catch(() => {});
  }
  async function end(reason = '') {
    const token = refreshToken.current;
    clear(reason);
    if (token) await raw.post('users/session/end', { refreshToken: token }).catch(() => {});
  }
  function checkDeadline() {
    if (current.current && Date.now() >= deadline.current) {
      void end(Date.now() >= absolute.current ? 'Sua sessão atingiu o tempo máximo. Entre novamente.' : 'Sua sessão foi encerrada após 15 minutos de inatividade. Entre novamente.');
      throw new ApiError('Sessão encerrada por inatividade.', 'INACTIVITY_TIMEOUT', 401);
    }
  }
  async function refresh(): Promise<Session> {
    checkDeadline();
    if (!refreshing.current) {
      const originalEpoch = epoch.current;
      refreshing.current = (async () => {
        const { data } = await raw.post('users/session/refresh', { refreshToken: refreshToken.current });
        const next = parseSession(data);
        if (originalEpoch !== epoch.current) throw new ApiError('Sessão encerrada.', 'SESSION_REVOKED', 401);
        refreshToken.current = next.refreshToken;
        await save(next);
        if (originalEpoch !== epoch.current) throw new ApiError('Sessão encerrada.', 'SESSION_REVOKED', 401);
        commit(next); return next;
      })().catch((error: unknown) => {
        if (originalEpoch === epoch.current && toApiError(error).status === 401) clear('Sua sessão expirou. Entre novamente.');
        throw error;
      }).finally(() => { refreshing.current = null; });
    }
    return refreshing.current;
  }
  async function access(force = false) {
    if (accountChange.current) await accountChange.current;
    checkDeadline();
    if (!current.current) return null;
    if (force || Date.parse(current.current.expiresAt) <= Date.now() + 30000) await refresh();
    return current.current?.token ?? null;
  }
  async function flush(force = false) {
    if (accountChange.current || !current.current || !dirty.current || sending.current || (!force && Date.now() - lastSent.current < 30000)) return;
    sending.current = true;
    const originalEpoch = epoch.current, originalDeadline = deadline.current;
    try {
      const token = await access();
      if (!token || originalEpoch !== epoch.current) return;
      const { data } = await raw.post('users/session/activity', { idleForMs: Math.max(0, Date.now() - lastInteractionAt.current) }, { headers: { Authorization: `Bearer ${token}` } });
      if (originalEpoch !== epoch.current || !current.current) return;
      lastSent.current = Date.now();
      if (deadline.current === originalDeadline) dirty.current = false;
      const next = { ...current.current, ...data } as Session;
      await save(next);
      if (originalEpoch === epoch.current) commit(next);
    } catch (error) {
      if (originalEpoch === epoch.current && toApiError(error).status === 401) clear('Sua sessão expirou. Entre novamente.');
      throw error;
    } finally { sending.current = false; }
  }
  function markActivity() {
    if (!current.current) return;
    try { checkDeadline(); } catch { return; }
    const nextDeadline = Math.min(Date.now() + IDLE_MS, absolute.current);
    lastInteractionAt.current = Date.now();
    if (nextDeadline > deadline.current) warned.current = false;
    deadline.current = nextDeadline; dirty.current = true;
    if (AppState.currentState === 'active') void flush().catch(() => {});
  }
  useEffect(() => {
    const request = client.interceptors.request.use(async (config) => {
      const token = await access();
      if (token) config.headers.Authorization = `Bearer ${token}`; else delete config.headers.Authorization;
      (config as typeof config & { sessionEpoch: number }).sessionEpoch = epoch.current;
      return config;
    });
    const response = client.interceptors.response.use((response) => {
      if ((response.config as typeof response.config & { sessionEpoch?: number }).sessionEpoch !== epoch.current) return Promise.reject(new ApiError('A sessão mudou durante a requisição.', 'SESSION_REVOKED', 401));
      return response;
    }, async (error: unknown) => {
      const normalized = toApiError(error);
      const config = normalized.request;
      if (config?.sessionEpoch !== undefined && config.sessionEpoch !== epoch.current) return Promise.reject(error);
      if (normalized.status === 401 && current.current && normalized.code === 'SESSION_EXPIRED' && config && !config.retried) {
        await access(true); return client.request({ ...config, retried: true } as typeof config);
      }
      if (normalized.status === 401 && current.current) clear('Sua sessão expirou. Entre novamente.');
      return Promise.reject(error);
    });
    return () => { client.interceptors.request.eject(request); client.interceptors.response.eject(response); };
    // Os callbacks leem refs, sem instalar interceptores em cada renovação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await SecureStore.deleteItemAsync(`reporta-session-${environment.appEnv}`);
        if (!active) return;
        const stored = await SecureStore.getItemAsync(storageKey);
        if (!active) return;
        if (!stored) return;
        const credential = JSON.parse(stored) as { apiBaseUrl: string; refreshToken: string; idleExpiresAt: string; sessionExpiresAt: string };
        if (credential.apiBaseUrl !== environment.apiBaseUrl || !/^[a-f0-9]{64}$/.test(credential.refreshToken)) {
          await writeStorage(() => SecureStore.deleteItemAsync(storageKey)); return;
        }
        if (!Number.isFinite(Date.parse(credential.idleExpiresAt)) || Date.parse(credential.idleExpiresAt) <= Date.now()
          || !Number.isFinite(Date.parse(credential.sessionExpiresAt)) || Date.parse(credential.sessionExpiresAt) <= Date.now()) {
          // Revogar também a família no servidor, inclusive se esse refresh antigo já foi usado.
          await raw.post('users/session/end', { refreshToken: credential.refreshToken }).catch(() => {});
          await writeStorage(() => SecureStore.deleteItemAsync(storageKey));
          if (active) setNotice('Sua sessão expirou por inatividade ou tempo máximo. Entre novamente.');
          return;
        }
        refreshToken.current = credential.refreshToken;
        if (active) await refresh();
      } catch {
        if (active) clear('Não foi possível restaurar sua sessão. Entre novamente.');
      } finally { if (active) setRestoring(false); }
    })();
    return () => { active = false; epoch.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment, storageKey]);
  useEffect(() => {
    function tick() {
      if (!current.current) return;
      try { checkDeadline(); } catch { return; }
      if (AppState.currentState !== 'active') return;
      void flush().catch(() => {});
      if (!warned.current && deadline.current - Date.now() <= 60000) {
        warned.current = true;
        Alert.alert('Sua sessão vai expirar', 'A sessão expira em breve. Deseja continuar conectado? Se o tempo máximo de uso foi atingido, será necessário entrar novamente.', [
          { text: 'Sair', onPress: () => { void end(); } },
          { text: 'Continuar', onPress: () => { markActivity(); void flush(true).catch(() => Alert.alert('Sessão', 'Não foi possível confirmar sua atividade. Verifique a conexão.')); } }
        ]);
      }
    }
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') tick(); else if (dirty.current) void flush(true).catch(() => {}); });
    return () => { clearInterval(timer); subscription.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function signIn(email: string, password: string) {
    const originalEpoch = ++epoch.current;
    const next = await login(raw, email, password);
    if (originalEpoch !== epoch.current) throw new ApiError('Login cancelado.', 'SESSION_REVOKED');
    await save(next);
    if (originalEpoch !== epoch.current) throw new ApiError('Login cancelado.', 'SESSION_REVOKED');
    commit(next); setNotice('');
  }
  async function updateAccount(input: AccountUpdate) {
    if (accountChange.current) throw new ApiError('Atualização em andamento.', 'ACCOUNT_BUSY');
    const token = await access();
    if (!token || !current.current) throw new ApiError('Entre novamente.', 'SESSION_REVOKED', 401);
    const original = current.current;
    const sensitive = !!input.novaSenha || input.email.trim().toLowerCase() !== original.user.email;
    const originalEpoch = ++epoch.current;
    const pending = (async () => {
      try {
        const { data } = await raw.put('users/update', input, { headers: { Authorization: `Bearer ${token}` } });
        if (originalEpoch !== epoch.current) throw new ApiError('Sessão encerrada.', 'SESSION_REVOKED', 401);
        const next = data.refreshToken ? parseSession(data) : { ...current.current!, user: parseUser(data.user) };
        if (next.user.id !== original.user.id) throw new ApiError('Conta inválida.', 'INVALID_RESPONSE');
        await save(next);
        if (originalEpoch !== epoch.current) throw new ApiError('Sessão encerrada.', 'SESSION_REVOKED', 401);
        commit(next);
      } catch (reason) {
        const failure = toApiError(reason);
        if (originalEpoch === epoch.current && (failure.status === 401 || (sensitive && (!failure.status || failure.status >= 500)))) clear('Não foi possível confirmar a atualização da sessão. Entre novamente.');
        throw reason;
      }
    })();
    accountChange.current = pending;
    try { await pending; } finally { if (accountChange.current === pending) accountChange.current = null; }
  }
  return <Context.Provider value={{ user: session?.user ?? null, client, restoring, notice, signIn, signOut: () => end(), updateAccount }}>
    <SessionActivityContext.Provider value={markActivity}><View style={{ flex: 1 }} onTouchStart={markActivity} onTouchMove={markActivity}>{children}</View></SessionActivityContext.Provider>
  </Context.Provider>;
}
export function useAuth(): Auth {
  const value = useContext(Context); if (!value) throw new Error('AuthProvider ausente.'); return value;
}
