import { render, screen } from '@testing-library/react'
import PrivateRoute from '../../src/routes/PrivateRoute'
import { AuthContext } from '../../src/context/authContext'
import { PERMISSIONS } from '../../src/utils/accessControl'

jest.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <span>Redirecionado para {to}</span>,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true })
jest.mock('../../src/context/authContext', () => {
  const React = require('react')
  return { AuthContext: React.createContext() }
})
jest.mock('../../src/components/Navbar', () => () => <nav>Navbar</nav>)
jest.mock('../../src/components/Footer', () => () => <footer>Footer</footer>)

function renderRoute(context, permission = PERMISSIONS.MODERATION_VIEW) {
  render(
    <AuthContext.Provider value={context}>
      <PrivateRoute permission={permission}><div>Conteúdo protegido</div></PrivateRoute>
    </AuthContext.Provider>
  )
}

test('redireciona visitante para o login', () => {
  renderRoute({ isAuthenticated: false, user: null })
  expect(screen.getByText('Redirecionado para /login')).toBeInTheDocument()
})

test('explica a restrição para usuário autenticado sem permissão', () => {
  renderRoute({ isAuthenticated: true, user: { permissions: [] } })
  expect(screen.getByRole('alert')).toHaveTextContent('Acesso não disponível')
  expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
})

test('renderiza a página para usuário com a permissão exigida', () => {
  renderRoute({
    isAuthenticated: true,
    user: { permissions: [PERMISSIONS.MODERATION_VIEW] }
  })
  expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
})
