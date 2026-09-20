import { fireEvent, render, screen } from '@testing-library/react';
import ReopenReportButton from '../../src/components/ReopenReportButton';

test('bloqueia reabertura de denúncia resolvida e explica o motivo', () => {
  const reopen = jest.fn();
  const { rerender } = render(<ReopenReportButton report={{ id: 7, resolucaoStatus: 'resolvida' }} onReopen={reopen} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reabrir moderação' }));
  expect(screen.getByRole('button')).toBeDisabled();
  expect(reopen).not.toHaveBeenCalled();
  expect(screen.getByText(/já foi resolvida/)).toBeInTheDocument();
  rerender(<ReopenReportButton report={{ id: 7, resolucaoStatus: 'em_andamento' }} onReopen={reopen} />);
  fireEvent.click(screen.getByRole('button'));
  expect(reopen).toHaveBeenCalledWith(7);
});
