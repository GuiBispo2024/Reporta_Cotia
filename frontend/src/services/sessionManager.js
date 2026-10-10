import axios from 'axios';
export const IDLE_MS = 15 * 60 * 1000;
export const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : process.env.REACT_APP_API_URL;
const transport = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 15000, headers: { 'X-Session-Client': 'web' } });
let session = null, generation = 0, refreshing = null, activityPromise = null;
let dirty = false, lastActivitySent = 0, lastBroadcast = 0;
let lastInteractionAt = 0;
let reason = '';
export const sessionNotice = () => reason === 'inactivity' ? 'Sessão encerrada após 15 minutos de inatividade. Entre novamente.' : reason ? 'Sua sessão expirou ou foi encerrada. Entre novamente.' : '';
const listeners = new Set();
let operations = Promise.resolve();
function sessionOperation(action) {
  const run = () => navigator.locks?.request ? navigator.locks.request('rc-session-refresh', action) : action();
  const pending = operations.then(run, run); operations = pending.catch(() => {}); return pending;
}
export async function loginSession(credentials) {
  const epoch = ++generation;
  return sessionOperation(async () => {
    const { data } = await transport.post('/users/login', credentials);
    if (epoch !== generation) throw new Error('Login cancelado. Tente novamente.');
    return acceptSession(data);
  });
}
export const getSession = () => session;
export const getAccessToken = () => session?.token ?? null;
export const subscribeSession = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const publish = () => listeners.forEach((listener) => listener(session));
export const remainingSeconds = () => {
  if (!session) return 0;
  // Ao retomar uma aba suspensa, considerar atividade real registrada nas outras abas.
  try {
    const event = JSON.parse(localStorage.getItem('rc-session-event') || 'null');
    if (event?.type === 'activity' && event.sessionId === session.sessionId && Number.isFinite(event.at) && event.at <= Date.now()
      && event.at + IDLE_MS > Date.parse(session.idleExpiresAt)) session = { ...session, idleExpiresAt: new Date(Math.min(event.at + IDLE_MS, Date.parse(session.sessionExpiresAt))).toISOString() };
  } catch { /* O servidor é a autoridade para expiração. */ }
  return Math.max(0, Math.ceil((Math.min(Date.parse(session.idleExpiresAt), Date.parse(session.sessionExpiresAt)) - Date.now()) / 1000));
};
function broadcast(type) {
  try { localStorage.setItem('rc-session-event', JSON.stringify({ type, sessionId: session?.sessionId, at: Date.now() })); } catch { /* Servidor continua validando se armazenamento estiver desabilitado. */ }
}
export function acceptSession(data) {
  if (!data?.token || !data.user || !data.sessionId || !Number.isFinite(Date.parse(data.expiresAt)) || !Number.isFinite(Date.parse(data.idleExpiresAt)) || !Number.isFinite(Date.parse(data.sessionExpiresAt))) throw new Error('Resposta de sessão inválida.');
  const changed = session?.sessionId !== data.sessionId;
  const idleExpiresAt = !changed && dirty && Date.parse(session.idleExpiresAt) > Date.parse(data.idleExpiresAt) ? session.idleExpiresAt : data.idleExpiresAt;
  session = { ...data, idleExpiresAt };
  reason = '';
  if (changed) { dirty = false; lastActivitySent = Date.now(); broadcast('login'); }
  try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* Sem credenciais persistidas. */ }
  publish(); return session;
}
export function clearSession(cause = '', notifyTabs = true) {
  if (notifyTabs) broadcast('logout');
  session = null; generation += 1; dirty = false; reason = cause;
  try { localStorage.removeItem('token'); localStorage.removeItem('user'); if (cause) localStorage.setItem('sessionExpired', cause); } catch { /* Sessão em memória já encerrada. */ }
  publish();
}
export async function endSession(reason = '') {
  clearSession(reason);
  await sessionOperation(() => transport.post('/users/session/end')).catch(() => {});
}
export async function refreshSession() {
  if (session && remainingSeconds() === 0) { await endSession('inactivity'); throw new Error('Sessão encerrada por inatividade.'); }
  if (!refreshing) {
    const epoch = generation;
    const refresh = async () => {
      const { data } = await transport.post('/users/session/refresh');
      if (epoch !== generation) throw new Error('Sessão encerrada durante a renovação.');
      return acceptSession(data);
    };
    refreshing = sessionOperation(refresh).catch((error) => {
      if (error.response?.status === 401 && epoch === generation) clearSession(session ? 'expired' : '', !!session);
      throw error;
    }).finally(() => { refreshing = null; });
  }
  return refreshing;
}
export async function ensureAccessToken(force = false) {
  if (!session) return null;
  if (remainingSeconds() === 0) { await endSession('inactivity'); throw new Error('Sessão encerrada por inatividade.'); }
  if (force || Date.parse(session.expiresAt) <= Date.now() + 30000) await refreshSession();
  return getAccessToken();
}
export function markActivity() {
  if (!session) return;
  if (remainingSeconds() === 0) { void endSession('inactivity'); return; }
  const now = Date.now();
  lastInteractionAt = now;
  session = { ...session, idleExpiresAt: new Date(Math.min(now + IDLE_MS, Date.parse(session.sessionExpiresAt))).toISOString() }; dirty = true;
  if (now - lastBroadcast >= 1000) { broadcast('activity'); lastBroadcast = now; }
}
export async function flushActivity(force = false) {
  if (!session || !dirty || activityPromise || (!force && Date.now() - lastActivitySent < 30000)) return;
  if (Date.now() - lastInteractionAt >= IDLE_MS) { dirty = false; return; }
  const epoch = generation, activityDeadline = session.idleExpiresAt;
  activityPromise = (async () => {
    const token = await ensureAccessToken();
    if (!token || epoch !== generation) return;
    const { data } = await transport.post('/users/session/activity', { idleForMs: Math.max(0, Date.now() - lastInteractionAt) }, { headers: { Authorization: `Bearer ${token}` } });
    if (epoch !== generation || !session) return;
    lastActivitySent = Date.now();
    if (session.idleExpiresAt === activityDeadline) { dirty = false; session = { ...session, ...data }; publish(); }
  })().catch((error) => {
    if (error.response?.status === 401 && epoch === generation) clearSession('expired');
    throw error;
  }).finally(() => { activityPromise = null; });
  return activityPromise;
}
export function syncTab(event) {
  if (event.key !== 'rc-session-event' || !event.newValue || !session) return;
  try {
    const data = JSON.parse(event.newValue);
    if (data.type === 'activity' && data.sessionId === session.sessionId && Number.isFinite(data.at) && data.at <= Date.now()) session = { ...session, idleExpiresAt: new Date(Math.min(data.at + IDLE_MS, Date.parse(session.sessionExpiresAt))).toISOString() };
    else if (data.type === 'logout' || (data.type === 'login' && data.sessionId !== session.sessionId)) clearSession('changed', false);
  } catch { /* Mensagens inválidas não alteram a sessão. */ }
}
