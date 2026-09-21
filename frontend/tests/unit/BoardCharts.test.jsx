import { render, screen, within } from '@testing-library/react';
import BoardCharts from '../../src/components/BoardCharts';

const summary = { pendente: 2, aberta: 5, em_andamento: 3, resolvida: 4, rejeitada: 1 };
const categories = [
  { label: 'Iluminação pública', total: 6 },
  { label: 'Outros', total: 3 }
];
const neighborhoods = [
  { label: 'Centro', total: 7 },
  { label: 'Granja Viana', total: 4 }
];
const trend = [
  { period: '2026-01', total: 2 },
  { period: '2026-02', total: 5 }
];
const categoryTrend = {
  periods: ['2026-01', '2026-02'],
  series: [
    { label: 'Iluminação pública', total: 5, values: [2, 3] },
    { label: 'Outros', total: 2, values: [0, 2] }
  ]
};

test('apresenta gráficos acessíveis de situação, categoria e evolução', () => {
  render(<BoardCharts summary={summary} categories={categories} neighborhoods={neighborhoods} trend={trend} categoryTrend={categoryTrend} />);

  expect(screen.getByRole('heading', { name: 'Gráficos dos indicadores' })).toBeInTheDocument();
  const categoryChart = screen.getByRole('heading', { name: 'Categorias mais recorrentes' }).closest('article');
  expect(within(categoryChart).getByText('Iluminação pública')).toBeInTheDocument();
  expect(within(categoryChart).getByText('6')).toBeInTheDocument();
  const neighborhoodChart = screen.getByRole('heading', { name: 'Bairros com mais denúncias' }).closest('article');
  expect(within(neighborhoodChart).getByText('Centro')).toBeInTheDocument();
  expect(within(neighborhoodChart).getByText('7')).toBeInTheDocument();
  const trendChart = screen.getByRole('heading', { name: 'Evolução mensal' }).closest('article');
  expect(within(trendChart).getByText(/jan.*2026/i)).toBeInTheDocument();
  expect(within(trendChart).getByText(/fev.*2026/i)).toBeInTheDocument();
  const categoryTrendTable = screen.getByRole('heading', { name: 'Evolução mensal por categoria' }).closest('article');
  expect(within(categoryTrendTable).getByRole('cell', { name: /Iluminação pública, jan.*2026: 2/i })).toHaveTextContent('2');
  expect(within(categoryTrendTable).getByRole('cell', { name: /Iluminação pública, fev.*2026: 3/i })).toHaveTextContent('3');
  expect(within(categoryTrendTable).getByRole('rowheader', { name: 'Outros' })).toBeInTheDocument();
})

test('board comunitário não inclui estados privados no gráfico', () => {
  render(<BoardCharts summary={summary} categories={categories} neighborhoods={neighborhoods} trend={trend} community />);

  const statusChart = screen.getByRole('heading', { name: 'Denúncias por situação' }).closest('article');
  expect(within(statusChart).queryByText('Em moderação')).not.toBeInTheDocument();
  expect(within(statusChart).queryByText('Rejeitadas')).not.toBeInTheDocument();
  expect(within(statusChart).getByText('Abertas')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Evolução mensal por categoria' })).not.toBeInTheDocument();
})
