import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SessionTimer from '../../src/components/SessionTimer';
import { AuthContext } from '../../src/context/authContext';
test('timer indica último minuto sem anunciar cada segundo e oferece continuação', async () => {
  const continueSession = jest.fn().mockResolvedValue();
  render(<AuthContext.Provider value={{ isAuthenticated: true, remainingSeconds: 59, continueSession }}><SessionTimer /></AuthContext.Provider>);
  expect(screen.getByRole('timer')).toHaveTextContent('00:59'); expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
  fireEvent.click(screen.getByRole('button', { name: 'Continuar conectado' })); expect(continueSession).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar conectado' })).not.toBeDisabled());
});
test('expiração informa o motivo também em páginas públicas e permite dispensar o aviso', () => {
  render(<AuthContext.Provider value={{ isAuthenticated: false, notice: 'Sessão encerrada por inatividade.' }}><SessionTimer /></AuthContext.Provider>);
  expect(screen.getByRole('alert')).toHaveTextContent('inatividade');
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' })); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
