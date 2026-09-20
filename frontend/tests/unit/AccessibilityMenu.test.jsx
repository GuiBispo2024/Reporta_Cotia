import { fireEvent, render, screen } from '@testing-library/react';
import AccessibilityMenu, { normalizeAccessibility } from '../../src/components/AccessibilityMenu';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.style.fontSize = '';
  window.matchMedia = jest.fn(() => ({ matches: false }));
});
afterEach(() => jest.restoreAllMocks());

const openPanel = () => {
  render(<AccessibilityMenu />);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir recursos de acessibilidade' }));
};

test('menu funciona com teclado e devolve o foco ao fechar', () => {
  openPanel();
  expect(screen.getByRole('button', { name: 'Fechar painel de acessibilidade' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Abrir recursos de acessibilidade' })).toHaveFocus();
  expect(screen.queryByRole('region', { name: 'Acessibilidade' })).not.toBeInTheDocument();
});

test('amplia até 200%, aplica globalmente e restaura preferências', () => {
  openPanel();
  expect(screen.getByRole('button', { name: 'Diminuir texto' })).toBeDisabled();
  for (let index = 0; index < 10; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Aumentar texto' }));
  expect(document.documentElement.style.fontSize).toBe('200%');
  expect(screen.getByRole('button', { name: 'Aumentar texto' })).toBeDisabled();
  expect(JSON.parse(localStorage.getItem('reportaAccessibility')).fontScale).toBe(200);
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar preferências' }));
  expect(document.documentElement.style.fontSize).toBe('100%');
  expect(document.documentElement).not.toHaveClass('rc-large-text');
});

test('contraste e modo escuro são exclusivos; leitura e movimento são independentes', () => {
  openPanel();
  fireEvent.click(screen.getByRole('checkbox', { name: /^Modo escuro/ }));
  expect(document.documentElement).toHaveClass('rc-dark');
  fireEvent.click(screen.getByRole('checkbox', { name: /^Alto contraste/ }));
  expect(document.documentElement).toHaveClass('rc-high-contrast');
  expect(document.documentElement).not.toHaveClass('rc-dark');
  fireEvent.click(screen.getByRole('checkbox', { name: /^Facilitar a leitura/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /^Reduzir animações/ }));
  expect(document.documentElement).toHaveClass('rc-high-contrast', 'rc-readable-font', 'rc-reduced-motion');
});

test('ignora preferências inválidas e funciona quando armazenamento é bloqueado', () => {
  expect(normalizeAccessibility({ fontScale: -100, contrast: 'false', darkMode: true })).toMatchObject({ fontScale: 100, contrast: false, darkMode: true });
  expect(normalizeAccessibility({ fontScale: 500, contrast: true, darkMode: true })).toMatchObject({ fontScale: 200, contrast: true, darkMode: false });
  localStorage.setItem('reportaAccessibility', '{invalido');
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  openPanel();
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar texto' }));
  expect(document.documentElement.style.fontSize).toBe('110%');
  expect(screen.getByRole('status', { name: 'Avisos de acessibilidade' })).toHaveTextContent('não permite salvá-los');
});

test('respeita as preferências iniciais do dispositivo e alterações de outra aba', () => {
  window.matchMedia = jest.fn(() => ({ matches: true }));
  openPanel();
  expect(document.documentElement).toHaveClass('rc-dark', 'rc-reduced-motion');
  localStorage.setItem('reportaAccessibility', JSON.stringify({ fontScale: 150, darkMode: false }));
  fireEvent(window, new StorageEvent('storage', { key: 'reportaAccessibility' }));
  expect(document.documentElement.style.fontSize).toBe('150%');
  expect(document.documentElement).not.toHaveClass('rc-dark');
});
