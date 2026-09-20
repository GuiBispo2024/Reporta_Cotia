import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import useDialogAccessibility from '../../src/hooks/useDialogAccessibility';

function Example() {
  const [open, setOpen] = useState(false);
  const ref = useDialogAccessibility(open, () => setOpen(false));
  return <><button onClick={() => setOpen(true)}>Abrir</button>{open && <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Exemplo"><button>Primeiro</button><input aria-label="Nome" /><button>Último</button></section>}</>;
}

test('modal isola o fundo, mantém Tab dentro da janela e restaura foco com Escape', () => {
  render(<Example />);
  const opener = screen.getByRole('button', { name: 'Abrir' });
  opener.focus();
  fireEvent.click(opener);
  const first = screen.getByRole('button', { name: 'Primeiro' });
  const last = screen.getByRole('button', { name: 'Último' });
  expect(first).toHaveFocus();
  expect(opener).toHaveAttribute('inert');
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
  expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: 'Tab' });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).not.toHaveAttribute('inert');
  expect(opener).toHaveFocus();
  expect(document.body.style.overflow).toBe('');
});
