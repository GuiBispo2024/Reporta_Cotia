import { act, render, screen, waitFor } from '@testing-library/react'
import { AuthContext, AuthProvider } from '../../src/context/authContext'
import authService from '../../src/services/authService'

jest.mock('../../src/services/authService', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn(),
    getToken: jest.fn(),
    me: jest.fn(),
    login: jest.fn(),
    logoutRemote: jest.fn(),
    clearSession: jest.fn()
  }
}))

jest.mock('../../src/api/api', () => ({
  __esModule: true,
  default: { defaults: { headers: { common: {} } } }
}))

function SessionState() {
  return <AuthContext.Consumer>{({ user }) => (
    <span>{user?.permissions?.join(',') || 'sem permissões'}</span>
  )}</AuthContext.Consumer>
}

beforeEach(() => {
  jest.clearAllMocks()
  authService.getToken.mockReturnValue('TOKEN')
  authService.getUser.mockReturnValue({ id: 1, permissions: ['denuncia.create'] })
})

test('sincroniza os perfis e permissões ao retornar para a janela', async () => {
  authService.me
    .mockResolvedValueOnce({ id: 1, permissions: ['denuncia.create'] })
    .mockResolvedValueOnce({ id: 1, permissions: ['denuncia.create', 'moderation.view'] })

  render(<AuthProvider><SessionState /></AuthProvider>)
  await waitFor(() => expect(authService.me).toHaveBeenCalledTimes(1))

  act(() => window.dispatchEvent(new Event('focus')))

  expect(await screen.findByText('denuncia.create,moderation.view')).toBeInTheDocument()
  expect(authService.me).toHaveBeenCalledTimes(2)
})

test('mantém a sessão local quando a sincronização falha temporariamente', async () => {
  authService.me.mockRejectedValue(new Error('Falha de rede'))

  render(<AuthProvider><SessionState /></AuthProvider>)

  await waitFor(() => expect(authService.me).toHaveBeenCalledTimes(1))
  expect(screen.getByText('denuncia.create')).toBeInTheDocument()
  expect(authService.clearSession).not.toHaveBeenCalled()
})

test('encerra a sessão local quando o servidor informa que ela não é mais válida', async () => {
  authService.me.mockRejectedValue({ response: { status: 401 } })

  render(<AuthProvider><SessionState /></AuthProvider>)

  await waitFor(() => expect(authService.clearSession).toHaveBeenCalledTimes(1))
  expect(screen.getByText('sem permissões')).toBeInTheDocument()
})
