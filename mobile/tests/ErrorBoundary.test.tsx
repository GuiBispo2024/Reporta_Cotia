import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

test('mostra fallback e recupera a árvore ao tentar novamente', () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const report = jest.fn();
  let shouldThrow = true;
  function Child() {
    if (shouldThrow) throw new Error('Falha de teste');
    return <Text>Aplicativo recuperado</Text>;
  }
  try {
    render(<ErrorBoundary onError={report}><Child /></ErrorBoundary>);
    expect(screen.getByText('Não foi possível abrir esta tela')).toBeTruthy();
    expect(report).toHaveBeenCalled();
    shouldThrow = false;
    fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.getByText('Aplicativo recuperado')).toBeTruthy();
  } finally {
    log.mockRestore();
    warning.mockRestore();
  }
});
