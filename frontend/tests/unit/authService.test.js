import authService from '../../src/services/authService';
import { acceptSession, clearSession } from '../../src/services/sessionManager';
jest.mock('../../src/api/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
beforeEach(() => { localStorage.clear(); clearSession('', false); });
test('não confia em usuário e JWT gravados no localStorage', () => {
  localStorage.setItem('user', JSON.stringify({ id: 1, roles: ['ADMIN'] })); localStorage.setItem('token', 'legacy');
  expect(authService.getUser()).toBeNull(); expect(authService.getToken()).toBeNull(); expect(authService.isAuthenticated()).toBe(false);
});
test('sessão validada é lida da memória e descartada no logout local', () => {
  acceptSession({ token: 'access', user: { id: 1 }, sessionId: 'session-1', expiresAt: new Date(Date.now() + 300000).toISOString(), idleExpiresAt: new Date(Date.now() + 900000).toISOString(), sessionExpiresAt: new Date(Date.now() + 28800000).toISOString() });
  expect(authService.getUser()).toEqual({ id: 1 }); authService.clearSession(); expect(authService.getToken()).toBeNull();
});
