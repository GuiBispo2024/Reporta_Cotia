import { render, screen } from '@testing-library/react';
import Navbar from '../../src/components/Navbar';
import { AuthContext } from '../../src/context/authContext';
import { PERMISSIONS } from '../../src/utils/accessControl';

jest.mock('../../src/context/authContext', () => ({ AuthContext: require('react').createContext() }));
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  NavLink: ({ to, children, className, end, ...props }) => <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className} {...props}>{children}</a>
}), { virtual: true });

function setup(user) {
  render(<AuthContext.Provider value={{ user, isAuthenticated: !!user, logout: jest.fn() }}><Navbar /></AuthContext.Provider>);
}

test('usuário comum acessa o board comunitário pela aba principal', () => {
  setup({ id: 1, username: 'Maria', roles: ['CITIZEN'], permissions: [PERMISSIONS.DASHBOARD_PUBLIC_VIEW] });
  const link = screen.getByRole('link', { name: 'Boards' });
  expect(link).toHaveAttribute('href', '/boards/comunidade');
  expect(link).toHaveClass('nav-link');
  expect(link.closest('.dropdown-menu')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Meu board' })).not.toBeInTheDocument();
});

test.each(['ANALYST', 'ADMIN'])('%s acessa o board detalhado conforme sua permissão', role => {
  setup({ id: 2, username: 'Ana', roles: [role], permissions: [PERMISSIONS.DASHBOARD_FULL_VIEW] });
  expect(screen.getByRole('link', { name: 'Boards' })).toHaveAttribute('href', '/boards/analitico');
});

test('nome do perfil não substitui permissão e visitante não vê boards privados', () => {
  setup({ id: 3, username: 'João', roles: ['ANALYST'], permissions: [] });
  expect(screen.getByRole('link', { name: 'Boards' })).toHaveAttribute('href', '/meu-board');
});

test('visitante vê somente os acessos públicos', () => {
  setup(null);
  expect(screen.queryByRole('link', { name: 'Boards' })).not.toBeInTheDocument();
});

test('somente usuário com permissão de auditoria vê o histórico de exportações', () => {
  setup({ id: 4, username: 'Admin', roles: ['ADMIN'], permissions: [PERMISSIONS.DASHBOARD_FULL_VIEW, PERMISSIONS.DASHBOARD_AUDIT_VIEW] });
  expect(screen.getByRole('link', { name: 'Auditoria de exportações' })).toHaveAttribute('href', '/administracao/historico-exportacoes');
});
