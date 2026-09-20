const STATUS_LABELS = {
  pendente: 'Em moderação',
  aberta: 'Abertas',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvidas',
  rejeitada: 'Rejeitadas'
};

function periodLabel(period) {
  const date = new Date(`${period}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
}

function BarChart({ title, items, emptyMessage }) {
  const maximum = Math.max(...items.map(item => item.total), 0);
  return <article className="rc-board-chart">
    <h3>{title}</h3>
    {!items.length ? <p>{emptyMessage}</p> : <ol>
      {items.map(item => <li key={item.key} className={item.className || ''}>
        <span className="rc-board-chart-label"><span>{item.label}</span><strong>{item.total}</strong></span>
        <span className="rc-board-chart-track" aria-hidden="true"><span style={{ width: `${maximum && item.total ? Math.max(item.total / maximum * 100, 4) : 0}%` }} /></span>
      </li>)}
    </ol>}
  </article>;
}

export default function BoardCharts({ summary = {}, categories = [], trend = [], community = false }) {
  const statusKeys = community
    ? ['aberta', 'em_andamento', 'resolvida']
    : ['pendente', 'aberta', 'em_andamento', 'resolvida', 'rejeitada'];
  const statusItems = statusKeys.map(key => ({
    key,
    label: STATUS_LABELS[key],
    total: Number(summary[key] || 0),
    className: `is-${key}`
  }));
  const categoryItems = categories.slice(0, 6).map(item => ({
    key: item.label,
    label: item.label,
    total: Number(item.total || 0)
  }));
  const trendItems = trend.map(item => ({
    key: item.period,
    label: periodLabel(item.period),
    total: Number(item.total || 0)
  }));

  return <section className="rc-board-charts-section" aria-labelledby="board-charts-title">
    <header><span className="rc-board-eyebrow">Leitura visual</span><h2 id="board-charts-title">Gráficos dos indicadores</h2><p>Compare situações, categorias recorrentes e a evolução mensal do recorte selecionado.</p></header>
    <div className="rc-board-charts">
      <BarChart title="Denúncias por situação" items={statusItems} emptyMessage="Sem situações neste recorte." />
      <BarChart title="Categorias mais recorrentes" items={categoryItems} emptyMessage="Sem categorias neste recorte." />
      <BarChart title="Evolução mensal" items={trendItems} emptyMessage="Sem evolução mensal neste recorte." />
    </div>
  </section>;
}
