import { render, screen } from '@testing-library/react';
import BoardMap from '../../src/components/BoardMap';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>
}), { virtual: true });

const points = [
  { id: 1, titulo: 'Poste apagado', localizacao: 'Centro, Cotia', categoria: 'Iluminação pública', latitude: '-23.6000', longitude: '-46.9200', status: 'aprovada', resolucaoStatus: 'aberta' },
  { id: 2, titulo: 'Registro rejeitado', localizacao: 'Caucaia do Alto', categoria: 'Outros', latitude: '-23.6500', longitude: '-46.9700', status: 'rejeitada', resolucaoStatus: 'aberta' }
];

test('posiciona os pontos e oferece link somente para denúncia pública', () => {
  render(<BoardMap map={{ points, total: 2, limit: 500, truncated: false }} />);

  expect(screen.getByTitle('Mapa das denúncias do board')).toHaveAttribute('src', expect.stringContaining('openstreetmap.org/export/embed.html'));
  expect(screen.getByRole('link', { name: /abrir denúncia: poste apagado/i })).toHaveAttribute('href', '/denuncia/1');
  expect(screen.getByRole('img', { name: /registro rejeitado/i })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /registro rejeitado/i })).not.toBeInTheDocument();
  expect(screen.getByText('2 pontos exibidos')).toBeInTheDocument();
});

test('explica quando o limite geográfico foi atingido', () => {
  render(<BoardMap map={{ points: [points[0]], total: 700, limit: 500, truncated: true }} />);

  expect(screen.getByText(/pontos mais recentes de 700/i)).toBeInTheDocument();
});

test('mostra estado vazio quando não há coordenadas válidas', () => {
  render(<BoardMap map={{ points: [{ id: 1, latitude: null, longitude: null }], total: 0, limit: 500, truncated: false }} />);

  expect(screen.getByText(/ainda não possuem coordenadas/i)).toBeInTheDocument();
  expect(screen.queryByTitle('Mapa das denúncias do board')).not.toBeInTheDocument();
});
