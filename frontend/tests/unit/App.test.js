import { render, screen } from '@testing-library/react'
import App from '../../src/App'

jest.mock('../../src/context/authContext', () => ({
  AuthProvider: ({ children }) => children
}))
jest.mock('../../src/routes/AppRoutes', () => () => <main id="main-content">Conteúdo principal</main>)
jest.mock('../../src/components/AccessibilityMenu', () => () => <button>Acessibilidade</button>)

test('renderiza a estrutura principal e o atalho de acessibilidade', () => {
  render(<App />)

  expect(screen.getByRole('link', { name: /pular para o conteúdo/i })).toHaveAttribute('href', '#main-content')
  expect(screen.getByRole('main')).toHaveTextContent('Conteúdo principal')
  expect(screen.getByRole('button', { name: /acessibilidade/i })).toBeInTheDocument()
})
