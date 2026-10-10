import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthContext, AuthProvider } from '../../src/context/authContext';
import authService from '../../src/services/authService';
import { acceptSession, clearSession } from '../../src/services/sessionManager';
jest.mock('../../src/services/authService', () => ({ __esModule: true, default: { restore: jest.fn(), me: jest.fn(), login: jest.fn() } }));
function State() { return <AuthContext.Consumer>{({ user, loading }) => <span>{loading ? 'restaurando' : user?.permissions?.join(',') || 'sem permissões'}</span>}</AuthContext.Consumer>; }
const fixture = () => ({ token: 'access', user: { id: 1, permissions: ['denuncia.create'] }, sessionId: 'session-1', expiresAt: new Date(Date.now() + 300000).toISOString(), idleExpiresAt: new Date(Date.now() + 900000).toISOString(), sessionExpiresAt: new Date(Date.now() + 28800000).toISOString() });
beforeEach(() => { jest.clearAllMocks(); clearSession('', false); authService.restore.mockImplementation(async () => acceptSession(fixture())); });
test('restaura via refresh e sincroniza permissões ao retornar à janela', async () => {
  authService.me.mockResolvedValue({ id: 1, permissions: ['denuncia.create', 'moderation.view'] });
  render(<AuthProvider><State /></AuthProvider>); await screen.findByText('denuncia.create');
  act(() => window.dispatchEvent(new Event('focus')));
  await screen.findByText('denuncia.create,moderation.view');
});
test('falha de rede não encerra sessão ativa em memória', async () => {
  authService.me.mockRejectedValue(new Error('offline'));
  render(<AuthProvider><State /></AuthProvider>); await screen.findByText('denuncia.create');
  act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(authService.me).toHaveBeenCalled()); expect(screen.getByText('denuncia.create')).toBeInTheDocument();
});
test('401 encerra a sessão em vez de confiar no cache de permissões', async () => {
  authService.me.mockRejectedValue({ response: { status: 401 } });
  render(<AuthProvider><State /></AuthProvider>); await screen.findByText('denuncia.create');
  act(() => window.dispatchEvent(new Event('focus'))); await screen.findByText('sem permissões');
});
