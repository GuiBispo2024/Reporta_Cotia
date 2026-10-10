import { acceptSession, clearSession, ensureAccessToken, flushActivity, getAccessToken, getSession, IDLE_MS, markActivity, refreshSession, remainingSeconds, syncTab } from '../../src/services/sessionManager';
const mockPost = jest.fn();
jest.mock('axios', () => ({ create: () => ({ post: (...args) => mockPost(...args) }) }));
const fixture = () => ({ token: 'access', user: { id: 1 }, sessionId: 'session-1', expiresAt: new Date(Date.now() + 300000).toISOString(), idleExpiresAt: new Date(Date.now() + IDLE_MS).toISOString(), sessionExpiresAt: new Date(Date.now() + 28800000).toISOString() });
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-10T12:00:00Z')); localStorage.clear(); clearSession('', false); mockPost.mockReset(); });
afterEach(() => jest.useRealTimers());
test('credenciais ficam em memória e usuário/token legado no armazenamento não restauram sessão', () => {
  localStorage.setItem('token', 'stolen-old-token'); localStorage.setItem('user', '{}');
  expect(getAccessToken()).toBeNull(); acceptSession(fixture());
  expect(getAccessToken()).toBe('access'); expect(localStorage.getItem('token')).toBeNull(); expect(localStorage.getItem('user')).toBeNull();
});
test('renovação concorrente é única e não estende a inatividade', async () => {
  const original = fixture(); acceptSession(original); jest.advanceTimersByTime(271000);
  mockPost.mockResolvedValue({ data: { ...original, token: 'renewed', expiresAt: new Date(Date.now() + 300000).toISOString() } });
  await Promise.all([ensureAccessToken(), ensureAccessToken()]);
  expect(mockPost).toHaveBeenCalledTimes(1); expect(getAccessToken()).toBe('renewed');
  expect(getSession().idleExpiresAt).toBe(original.idleExpiresAt);
});
test('15 minutos sem interação encerram a sessão sem renovar refresh', async () => {
  acceptSession(fixture()); jest.advanceTimersByTime(IDLE_MS); mockPost.mockResolvedValue({});
  await expect(ensureAccessToken()).rejects.toThrow('inatividade');
  expect(getSession()).toBeNull(); expect(mockPost).toHaveBeenCalledWith('/users/session/end');
});
test('interação explícita renova o prazo e é confirmada pelo servidor', async () => {
  acceptSession(fixture()); jest.advanceTimersByTime(600000); markActivity();
  mockPost.mockImplementation((url) => Promise.resolve({ data: url.includes('refresh') ? fixture() : { idleExpiresAt: new Date(Date.now() + IDLE_MS).toISOString() } }));
  await flushActivity(true); expect(remainingSeconds()).toBe(900);
  expect(mockPost).toHaveBeenCalledWith('/users/session/activity', { idleForMs: 0 }, expect.anything());
});
test('resposta tardia de refresh não ressuscita sessão encerrada', async () => {
  let resolve; mockPost.mockReturnValue(new Promise((done) => { resolve = done; }));
  const pending = refreshSession(); await Promise.resolve(); await Promise.resolve();
  clearSession('', false); resolve({ data: fixture() });
  await expect(pending).rejects.toThrow('encerrada'); expect(getSession()).toBeNull();
});
test('logout em outra aba limpa a memória sem revogar nova sessão do cookie', () => {
  acceptSession(fixture()); syncTab({ key: 'rc-session-event', newValue: JSON.stringify({ type: 'logout', sessionId: 'session-1' }) });
  expect(getSession()).toBeNull(); expect(mockPost).not.toHaveBeenCalled();
});
