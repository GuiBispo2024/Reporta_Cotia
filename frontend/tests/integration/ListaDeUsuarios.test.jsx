import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userService from '../../src/services/userService'
import ListaDeUsuários from '../../src/pages/ListaDeUsuários'
import { AuthContext } from '../../src/context/authContext'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true })
jest.mock('../../src/context/authContext', () => {
  const React = require('react')
  return { AuthContext: React.createContext() }
})
jest.mock('../../src/services/userService', () => ({
  __esModule: true,
  default: {
    getAllWithDenunciaCount: jest.fn(),
    getAvailableRoles: jest.fn(),
    updateRoles: jest.fn()
  }
}))
jest.mock('../../src/components/Navbar', () => () => <nav>Navbar</nav>)
jest.mock('../../src/components/Footer', () => () => <footer>Footer</footer>)
jest.mock('../../src/components/UserAvatar', () => ({ user }) => <span>Avatar de {user.username}</span>)

const roleCatalog = [
  { name: 'ADMIN', description: 'Gerencia usuários e acessos.' },
  { name: 'ANALYST', description: 'Consulta indicadores completos.' },
  { name: 'CITIZEN', description: 'Acessa os recursos dos cidadãos.' },
  { name: 'MODERATOR', description: 'Analisa denúncias e conteúdos.' }
]

const users = [
  { id: 1, username: 'Admin', email: 'admin@example.com', adm: true, roles: ['CITIZEN', 'ADMIN'], totalDenuncias: 2 },
  { id: 2, username: 'Cidadão', email: 'cidadao@example.com', adm: false, roles: ['CITIZEN'], totalDenuncias: 1 }
]

function renderPage(currentUser = { ...users[0], permissions: ['users.manage_roles'] }) {
  const setUser = jest.fn()
  render(
    <AuthContext.Provider value={{ user: currentUser, setUser }}>
      <ListaDeUsuários />
    </AuthContext.Provider>
  )
  return { setUser }
}

beforeEach(() => {
  jest.clearAllMocks()
  userService.getAllWithDenunciaCount.mockResolvedValue({ data: users, total: 2, page: 1, totalPages: 1 })
  userService.getAvailableRoles.mockResolvedValue(roleCatalog)
})

test('carrega usuários, perfis e controles administrativos', async () => {
  renderPage()

  expect((await screen.findAllByText('Cidadão')).length).toBeGreaterThan(0)
  await waitFor(() => expect(userService.getAvailableRoles).toHaveBeenCalledTimes(1))
  expect(screen.getAllByRole('button', { name: /gerenciar perfis/i })).toHaveLength(2)
  expect(screen.getByText('Administrador')).toBeInTheDocument()
})

test('adiciona o perfil de moderador e confirma a atualização', async () => {
  userService.updateRoles.mockResolvedValue({
    message: 'Perfis do usuário atualizados com sucesso.',
    user: { ...users[1], roles: ['CITIZEN', 'MODERATOR'] }
  })
  renderPage()

  const buttons = await screen.findAllByRole('button', { name: /gerenciar perfis/i })
  fireEvent.click(buttons[1])
  const dialog = screen.getByRole('dialog', { name: 'Cidadão' })
  fireEvent.click(within(dialog).getByRole('checkbox', { name: /moderador/i }))
  fireEvent.click(within(dialog).getByRole('button', { name: /salvar perfis/i }))

  await waitFor(() => expect(userService.updateRoles).toHaveBeenCalledWith(2, ['CITIZEN', 'MODERATOR']))
  expect(await screen.findByRole('status')).toHaveTextContent('Perfis do usuário atualizados com sucesso.')
  expect(screen.getByText('Moderador')).toBeInTheDocument()
})

test('mantém bloqueados os perfis básicos e o ADMIN da própria conta', async () => {
  renderPage()

  const buttons = await screen.findAllByRole('button', { name: /gerenciar perfis/i })
  fireEvent.click(buttons[0])
  const dialog = screen.getByRole('dialog', { name: 'Admin' })

  expect(within(dialog).getByRole('checkbox', { name: /cidadão/i })).toBeDisabled()
  expect(within(dialog).getByRole('checkbox', { name: /administrador/i })).toBeDisabled()
  expect(within(dialog).getByText(/sua administração está protegida/i)).toBeInTheDocument()
})
