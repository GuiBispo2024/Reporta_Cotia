import { render, screen } from '@testing-library/react';
import ImageCarousel from '../../src/components/ImageCarousel';

test('prioriza a foto enviada e mantém compatibilidade com a foto legada', () => {
  const { rerender } = render(<ImageCarousel images={['/foto.jpg']} fallback="/legada.jpg" categoria="Saneamento" alt="Ocorrência" />);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/foto.jpg');
  rerender(<ImageCarousel images={[]} fallback="/legada.jpg" alt="Ocorrência" />);
  expect(screen.getByRole('img')).toHaveAttribute('src', '/legada.jpg');
});

test('usa o setor, depois a categoria e por fim a ilustração genérica quando não há foto', () => {
  const { rerender } = render(<ImageCarousel setorResponsavel="Defesa Civil" categoria="Saneamento" />);
  expect(screen.getByRole('img').getAttribute('src')).toMatch(/\/defesa-civil.svg$/);
  expect(screen.getByRole('img')).toHaveAccessibleName('Ilustração do serviço: Defesa Civil');
  rerender(<ImageCarousel setorResponsavel="A definir" categoria="Saneamento" />);
  expect(screen.getByRole('img').getAttribute('src')).toMatch(/\/saneamento.svg$/);
  rerender(<ImageCarousel />);
  expect(screen.getByRole('img').getAttribute('src')).toMatch(/\/servicos-publicos.svg$/);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
