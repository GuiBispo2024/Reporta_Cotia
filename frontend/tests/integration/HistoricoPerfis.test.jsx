import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import HistoricoPerfis from '../../src/pages/HistoricoPerfis'
import userService from '../../src/services/userService'
import { AuthContext } from '../../src/context/authContext'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true })
jest.mock('../../src/context/authContext', () => {
  const React = require('react')
  return { AuthContext: React.createContext() }
})
jest.mock('../../src/services/userService', () => ({
  __esModule: true,
  default: { getRoleHistory: jest.fn() }
}))
jest.mock('../../src/components/Navbar', () => () => <nav>Navbar</nav>)
jest.mock('../../src/components/Footer', () => () => <footer>Footer</footer>)

const entries = [{
  id: 1,
  targetUserId: 15,
  targetUsername: 'Cidadão',
  changedByUserId: 2,
  changedByUsername: 'Administrador',
  previousRoles: ['CITIZEN'],
  newRoles: ['CITIZEN', 'MODERATOR'],
  createdAt: '2026-09-12T18:30:00.000Z'
}]

function renderPage() {
  render(
    <AuthContext.Provider value={{ user: { permissions: ['audit.view'] } }}>
      <HistoricoPerfis />
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  userService.getRoleHistory.mockResolvedValue({ data: entries, total: 21, page: 1, limit: 20, totalPages: 2 })
})

test('apresenta as alterações de perfis com responsável e paginação', async () => {
  renderPage()

  expect(await screen.findByText('Administrador')).toBeInTheDocument()
  expect(screen.getByText('Moderador')).toBeInTheDocument()
  expect(screen.getByText('21')).toBeInTheDocument()
  expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
  expect(userService.getRoleHistory).toHaveBeenCalledWith({
    page: 1,
    limit: 20,
    targetUserId: undefined,
    changedByUserId: undefined
  })
})

test('aplica filtros somente após a confirmação do usuário', async () => {
  renderPage()
  await screen.findByText('Administrador')

  fireEvent.change(screen.getByLabelText('Usuário alterado'), { target: { value: '15' } })
  fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: '2' } })
  expect(userService.getRoleHistory).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: /aplicar filtros/i }))

  await waitFor(() => expect(userService.getRoleHistory).toHaveBeenLastCalledWith({
    page: 1,
    limit: 20,
    targetUserId: '15',
    changedByUserId: '2'
  }))
})

test('carrega a próxima página do histórico', async () => {
  renderPage()
  await screen.findByText('Administrador')
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

  await waitFor(() => expect(userService.getRoleHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))
})
