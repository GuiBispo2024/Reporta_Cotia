import { fireEvent, render, screen, within } from '@testing-library/react';
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
  const link = screen.getByRole('link', { name: 'Indicadores' });
  expect(link).toHaveAttribute('href', '/boards/comunidade');
  expect(link).toHaveClass('nav-link');
  expect(link.closest('.dropdown-menu')).toBeNull();
  expect(screen.queryByRole('link', { name: 'Meu board' })).not.toBeInTheDocument();
});

test.each(['ANALYST', 'ADMIN'])('%s acessa o board detalhado conforme sua permissão', role => {
  setup({ id: 2, username: 'Ana', roles: [role], permissions: [PERMISSIONS.DASHBOARD_FULL_VIEW] });
  expect(screen.getByRole('link', { name: 'Indicadores' })).toHaveAttribute('href', '/boards/analitico');
});

test('nome do perfil não substitui permissão e visitante não vê boards privados', () => {
  setup({ id: 3, username: 'João', roles: ['ANALYST'], permissions: [] });
  expect(screen.getByRole('link', { name: 'Indicadores' })).toHaveAttribute('href', '/meu-board');
});

test('visitante vê somente os acessos públicos', () => {
  setup(null);
  expect(screen.queryByRole('link', { name: 'Indicadores' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Atalhos no celular' })).not.toBeInTheDocument();
});

test('menu recolhe ao navegar e ao pressionar Escape, devolvendo o foco', () => {
  setup(null);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
  expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('link', { name: 'Entrar' }));
  expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
  fireEvent.keyDown(screen.getByRole('link', { name: 'Entrar' }), { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
});

test('atalhos mobile oferecem o fluxo principal para usuário conectado', () => {
  setup({ id: 1, username: 'Maria', permissions: [] });
  const nav = within(screen.getByRole('navigation', { name: 'Atalhos no celular' }));
  expect(nav.getByRole('link', { name: 'Denunciar' })).toHaveAttribute('href', '/nova-denuncia');
  expect(nav.getByRole('link', { name: 'Minhas denúncias' })).toHaveAttribute('href', '/minhas-denuncias');
  expect(nav.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil');
});

test('menu fecha ao tocar fora e não oferece moderação sem permissão', () => {
  setup({ id: 1, username: 'Maria', permissions: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
  fireEvent.pointerDown(document.body);
  expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link', { name: 'Moderação' })).not.toBeInTheDocument();
});

test('atalho inferior fecha o menu complementar aberto', () => {
  setup({ id: 1, username: 'Maria', permissions: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
  const nav = within(screen.getByRole('navigation', { name: 'Atalhos no celular' }));
  fireEvent.click(nav.getByRole('link', { name: 'Perfil' }));
  expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false');
});
