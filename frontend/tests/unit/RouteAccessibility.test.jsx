import { render, screen, waitFor } from '@testing-library/react';
import RouteAccessibility from '../../src/components/RouteAccessibility';

let mockLocation = { pathname: '/', hash: '' };
jest.mock('react-router-dom', () => ({ useLocation: () => mockLocation }), { virtual: true });

test('atualiza título e foco ao navegar e preserva links para seções', async () => {
  const page = title => <><RouteAccessibility /><main id="main-content" tabIndex={-1}><h1>{title}</h1><button>Ação</button></main></>;
  const { rerender } = render(page('Início'));
  expect(document.title).toBe('Início | Reporta Cotia');
  screen.getByRole('button').focus();
  mockLocation = { pathname: '/perfil', hash: '' };
  rerender(page('Perfil'));
  expect(screen.getByRole('main')).toHaveFocus();
  expect(document.title).toBe('Perfil | Reporta Cotia');
  screen.getByRole('button').focus();
  mockLocation = { pathname: '/denuncia/1', hash: '#comentarios' };
  rerender(page('Denúncia'));
  expect(screen.getByRole('button')).toHaveFocus();
  rerender(page('Título carregado'));
  await waitFor(() => expect(document.title).toBe('Título carregado | Reporta Cotia'));
});
