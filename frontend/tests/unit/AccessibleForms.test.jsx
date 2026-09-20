import { render, screen } from '@testing-library/react';
import FilterAndSearch from '../../src/components/FilterAndSearch';
import Login from '../../src/pages/Login';

jest.mock('react-router-dom', () => ({ Link: ({ children }) => <a href="/">{children}</a>, useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../../src/context/authContext', () => ({ AuthContext: require('react').createContext({ login: jest.fn() }) }));
jest.mock('../../src/components/Navbar', () => () => <nav />);
jest.mock('../../src/components/Footer', () => () => <footer />);

test('login associa os rótulos aos campos e oferece destino para pular navegação', () => {
  render(<Login />);
  expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
  expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
});

test('filtros possuem nomes acessíveis e identificadores distintos por instância', () => {
  render(<><FilterAndSearch onFilter={jest.fn()} /><FilterAndSearch onFilter={jest.fn()} /></>);
  for (const label of ['Título ou assunto', 'Localização', 'Publicado por', 'Categoria', 'Status', 'Ordenação', 'Palavra na descrição']) {
    const controls = screen.getAllByLabelText(label);
    expect(controls).toHaveLength(2);
    expect(controls[0].id).not.toBe(controls[1].id);
  }
});
