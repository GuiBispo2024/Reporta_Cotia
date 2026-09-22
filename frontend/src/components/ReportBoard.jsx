import { useContext, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import boardService from '../services/boardService';
import { friendlyError } from '../utils/errorMessage';
import useDialogAccessibility from '../hooks/useDialogAccessibility';
import Navbar from './Navbar';
import Footer from './Footer';
import BoardMap from './BoardMap';
import BoardCharts from './BoardCharts';
import { AuthContext } from '../context/authContext';
import { hasPermission, PERMISSIONS } from '../utils/accessControl';
import './ReportBoard.css';

const SUMMARY_LABELS = { total: 'Total de denúncias', pendente: 'Em moderação', aberta: 'Abertas', em_andamento: 'Em andamento', resolvida: 'Resolvidas', rejeitada: 'Rejeitadas' };
const BREAKDOWN_LABELS = {
  categories: { title: 'Denúncias por categoria', column: 'Categoria' },
  sectors: { title: 'Denúncias por setor', column: 'Setor' },
  neighborhoods: { title: 'Denúncias por bairro', column: 'Bairro' },
  locations: { title: 'Denúncias por localização', column: 'Localização' }
};
const COMPARISON_METRICS = [
  { label: 'Total de denúncias', value: 'total', change: 'totalPercent' },
  { label: 'Aprovadas', value: 'approved', change: 'approvedPercent' },
  { label: 'Resolvidas', value: 'resolvida', change: 'resolvedPercent' },
  { label: 'Rejeitadas', value: 'rejeitada', change: 'rejectedPercent' }
];
const dateLabel = value => value ? new Date(value).toLocaleDateString('pt-BR') : 'Não informada';
const filterDateLabel = value => value ? value.split('-').reverse().join('/') : '';
const periodLabel = period => `${filterDateLabel(period.dataInicio)} a ${filterDateLabel(period.dataFim)}`;
const changeLabel = (value, suffix = '%') => value === null || value === undefined
  ? 'Sem base anterior'
  : `${value > 0 ? '+' : ''}${value}${suffix}`;
const dateTimeLabel = value => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value)).replace(',', '')
  : '';
const durationLabel = hours => {
  if (hours === null || hours === undefined) return 'Sem dados';
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${Math.max(minutes, 1)} min`;
  const days = Math.floor(minutes / 1440);
  const remainingHours = Math.floor((minutes % 1440) / 60);
  const remainingMinutes = minutes % 60;
  return [days && `${days} ${days === 1 ? 'dia' : 'dias'}`, remainingHours && `${remainingHours} h`, !days && remainingMinutes && `${remainingMinutes} min`].filter(Boolean).join(' ');
};

export default function ReportBoard({ analytical = false, community = false }) {
  const { user } = useContext(AuthContext) || {};
  const id = useId();
  const aggregated = analytical || community;
  const viewCopy = analytical
    ? { eyebrow: 'Gestão e indicadores', title: 'Board analítico', description: 'Consulte o andamento, os setores responsáveis e a distribuição de todas as denúncias.' }
    : community
      ? { eyebrow: 'Indicadores da comunidade', title: 'Board da comunidade', description: 'Veja como as denúncias aprovadas estão distribuídas por situação, categoria e localização.' }
      : { eyebrow: 'Acompanhamento', title: 'Meu board', description: 'Acompanhe suas denúncias, da moderação até a solução.' };
  const visibleSummaryLabels = community
    ? Object.entries(SUMMARY_LABELS).filter(([key]) => !['pendente', 'rejeitada'].includes(key))
    : Object.entries(SUMMARY_LABELS);
  const [data, setData] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [loadingColumns, setLoadingColumns] = useState({});
  const [columnErrors, setColumnErrors] = useState({});
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ categoria: '', setorResponsavel: '', bairro: '', dataInicio: '', dataFim: '' });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({ categories: [], sectors: [] });
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const revision = useRef(0);
  const requestController = useRef(null);
  const pendingColumns = useRef(new Set());
  const dialogRef = useDialogAccessibility(!!selected, () => setSelected(null));
  const canExport = analytical && hasPermission(user, PERMISSIONS.DASHBOARD_EXPORT);
  const canViewExportHistory = analytical && hasPermission(user, PERMISSIONS.DASHBOARD_AUDIT_VIEW);

  useEffect(() => {
    const version = ++revision.current;
    const controller = new AbortController();
    requestController.current = controller;
    pendingColumns.current.clear();
    setData(null);
    setHeatmap(null);
    setHeatmapLoading(aggregated);
    setHeatmapError('');
    setLoading(true);
    setError('');
    setColumnErrors({});
    setLoadingColumns({});
    setSelected(null);
    if (aggregated) {
      boardService.getHeatmap({ analytical, params: appliedFilters, signal: controller.signal })
        .then(result => {
          if (version === revision.current) setHeatmap(result);
        })
        .catch(err => {
          if (!controller.signal.aborted && version === revision.current) {
            setHeatmapError(friendlyError(err, 'Não foi possível carregar o mapa de calor. Tente novamente.'));
          }
        })
        .finally(() => {
          if (version === revision.current) setHeatmapLoading(false);
        });
    }
    boardService.getBoard({ analytical, community, params: aggregated ? appliedFilters : {}, signal: controller.signal })
      .then(result => {
        if (version !== revision.current) return;
        setData(result);
        if (result.breakdown && !appliedFilters.categoria && !appliedFilters.setorResponsavel && !appliedFilters.bairro) setFilterOptions(result.breakdown);
      })
      .catch(err => { if (!controller.signal.aborted) setError(friendlyError(err, 'Não foi possível carregar seu board. Tente novamente.')); })
      .finally(() => { if (version === revision.current) setLoading(false); });
    return () => { revision.current += 1; controller.abort(); };
  }, [aggregated, analytical, community, reload, appliedFilters]);

  const loadMore = async column => {
    if (pendingColumns.current.has(column.key) || column.page >= column.totalPages) return;
    const version = revision.current;
    pendingColumns.current.add(column.key);
    setLoadingColumns(current => ({ ...current, [column.key]: true }));
    setColumnErrors(current => ({ ...current, [column.key]: '' }));
    try {
      const result = await boardService.getBoard({ analytical, community, params: { ...(aggregated ? appliedFilters : {}), column: column.key, page: column.page + 1 }, signal: requestController.current.signal });
      if (version !== revision.current) return;
      const next = result.columns.find(item => item.key === column.key);
      setData(current => ({ ...current, columns: current.columns.map(item => {
        if (item.key !== column.key) return item;
        const seen = new Set(item.reports.map(report => report.id));
        return { ...next, reports: [...item.reports, ...next.reports.filter(report => !seen.has(report.id))] };
      }) }));
    } catch (err) {
      if (version === revision.current) setColumnErrors(current => ({ ...current, [column.key]: friendlyError(err, 'Não foi possível carregar mais denúncias. Tente novamente.') }));
    } finally {
      if (version === revision.current) {
        pendingColumns.current.delete(column.key);
        setLoadingColumns(current => ({ ...current, [column.key]: false }));
      }
    }
  };

  const exportBoard = async () => {
    setExporting(true);
    setExportMessage('');
    setExportError('');
    try {
      const { blob, filename } = await boardService.exportAnalytics(appliedFilters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportMessage('Planilha Excel gerada com os filtros aplicados.');
    } catch (err) {
      setExportError(friendlyError(err, 'Não foi possível exportar os indicadores. Tente novamente.'));
    } finally {
      setExporting(false);
    }
  };

  return <div className="rc-page">
    <Navbar />
    <main id="main-content" tabIndex={-1} className="container-fluid rc-board-page py-4 flex-grow-1">
      <header className="rc-board-header">
        <div><span className="rc-board-eyebrow">{viewCopy.eyebrow}</span><h1>{viewCopy.title}</h1><p>{viewCopy.description}</p></div>
        <div className="d-flex flex-wrap gap-2"><Link className="btn btn-outline-primary" to={aggregated ? '/meu-board' : '/minhas-denuncias'}>{aggregated ? 'Meu board pessoal' : 'Ver em lista'}</Link>{canViewExportHistory && <Link className="btn btn-outline-secondary" to="/administracao/historico-exportacoes"><i aria-hidden="true" className="bi bi-clock-history me-1" />Histórico de exportações</Link>}{canExport && <button className="btn btn-primary" onClick={exportBoard} disabled={loading || exporting}>{exporting ? 'Gerando planilha...' : 'Exportar Excel'}</button>}<button className="btn btn-outline-secondary" onClick={() => setReload(value => value + 1)} disabled={loading}>Atualizar</button></div>
      </header>
      {data?.generatedAt && <p className="rc-board-updated" aria-live="polite"><i className="bi bi-clock-history" aria-hidden="true" /> Dados atualizados em <time dateTime={data.generatedAt}>{dateTimeLabel(data.generatedAt)}</time></p>}
      {exportMessage && <p className="alert alert-success" role="status">{exportMessage}</p>}
      {exportError && <p className="alert alert-danger" role="alert">{exportError}</p>}

      {aggregated && <form className="rc-board-filters" onSubmit={event => { event.preventDefault(); setAppliedFilters({ ...filters }); }}>
        <label htmlFor={`${id}-category`}>Categoria<select id={`${id}-category`} className="form-select" value={filters.categoria} onChange={event => setFilters(current => ({ ...current, categoria: event.target.value }))}><option value="">Todas as categorias</option>{filterOptions.categories.map(item => <option key={item.label}>{item.label}</option>)}</select></label>
        <label htmlFor={`${id}-sector`}>Setor responsável<select id={`${id}-sector`} className="form-select" value={filters.setorResponsavel} onChange={event => setFilters(current => ({ ...current, setorResponsavel: event.target.value }))}><option value="">Todos os setores</option>{filterOptions.sectors.filter(item => item.label !== 'Não informado').map(item => <option key={item.label}>{item.label}</option>)}</select></label>
        <label htmlFor={`${id}-neighborhood`}>Bairro<select id={`${id}-neighborhood`} className="form-select" value={filters.bairro} onChange={event => setFilters(current => ({ ...current, bairro: event.target.value }))}><option value="">Todos os bairros</option>{(filterOptions.neighborhoods || []).filter(item => item.label !== 'Não informado').map(item => <option key={item.label}>{item.label}</option>)}</select></label>
        <label htmlFor={`${id}-start-date`}>Data inicial<input id={`${id}-start-date`} className="form-control" type="date" value={filters.dataInicio} max={filters.dataFim || undefined} onChange={event => setFilters(current => ({ ...current, dataInicio: event.target.value }))} /></label>
        <label htmlFor={`${id}-end-date`}>Data final<input id={`${id}-end-date`} className="form-control" type="date" value={filters.dataFim} min={filters.dataInicio || undefined} onChange={event => setFilters(current => ({ ...current, dataFim: event.target.value }))} /></label>
        <button className="btn btn-primary" disabled={loading}>Aplicar filtros</button>
        <button type="button" className="btn btn-outline-secondary" disabled={loading || (![filters.categoria, filters.setorResponsavel, filters.bairro, filters.dataInicio, filters.dataFim, appliedFilters.categoria, appliedFilters.setorResponsavel, appliedFilters.bairro, appliedFilters.dataInicio, appliedFilters.dataFim].some(Boolean))} onClick={() => { setFilters({ categoria: '', setorResponsavel: '', bairro: '', dataInicio: '', dataFim: '' }); setAppliedFilters({}); }}>Limpar filtros</button>
      </form>}

      {loading ? <p role="status" className="rc-board-state">Carregando denúncias...</p>
        : error ? <div role="alert" className="alert alert-danger">{error}<button className="btn btn-outline-danger ms-2" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></div>
        : data && <>
          <dl className="rc-board-summary" aria-label="Resumo das denúncias">
            {visibleSummaryLabels.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{data.summary[key]}</dd></div>)}
            {aggregated && <div><dt>Resolução das aprovadas</dt><dd>{data.summary.resolutionRate}%</dd></div>}
          </dl>
          {aggregated && <p className="rc-board-guidance">{community ? 'Os indicadores consideram somente denúncias aprovadas e não exibem conteúdos em moderação ou rejeitados.' : 'Os indicadores consideram todas as denúncias dos filtros aplicados. A taxa de resolução considera somente as aprovadas.'}</p>}
          {aggregated && data.metrics && <section className="rc-board-metrics" aria-labelledby={`${id}-metrics-title`}>
            <div><span className="rc-board-eyebrow">Eficiência do atendimento</span><h2 id={`${id}-metrics-title`}>Tempos médios</h2><p>Calculados somente com denúncias que possuem histórico completo no período selecionado.</p></div>
            <dl>
              <div><dt>Até a primeira moderação</dt><dd>{durationLabel(data.metrics.averageModerationHours)}</dd><small>{data.metrics.moderationSampleSize} {data.metrics.moderationSampleSize === 1 ? 'denúncia analisada' : 'denúncias analisadas'}</small></div>
              <div><dt>Da aprovação até a resolução</dt><dd>{durationLabel(data.metrics.averageResolutionHours)}</dd><small>{data.metrics.resolutionSampleSize} {data.metrics.resolutionSampleSize === 1 ? 'denúncia resolvida' : 'denúncias resolvidas'}</small></div>
            </dl>
          </section>}
          {analytical && data.comparison && <section className="rc-board-comparison" aria-labelledby={`${id}-comparison-title`}>
            <header><span className="rc-board-eyebrow">Análise temporal</span><h2 id={`${id}-comparison-title`}>Comparação com o período anterior</h2><p>Período atual: <strong>{periodLabel(data.comparison.current)}</strong> · anterior: <strong>{periodLabel(data.comparison.previous)}</strong></p></header>
            <div className="rc-board-comparison-grid">
              {COMPARISON_METRICS.map(metric => <article key={metric.value}>
                <h3>{metric.label}</h3>
                <strong>{data.comparison.current[metric.value]}</strong>
                <small>Anterior: {data.comparison.previous[metric.value]}</small>
                <span>{changeLabel(data.comparison.changes[metric.change])}</span>
              </article>)}
              <article><h3>Taxa de resolução</h3><strong>{data.comparison.current.resolutionRate}%</strong><small>Anterior: {data.comparison.previous.resolutionRate}%</small><span>{changeLabel(data.comparison.changes.resolutionRatePoints, ' p.p.')}</span></article>
            </div>
          </section>}
          {analytical && !data.comparison && <p className="rc-board-guidance">Informe a data inicial e a data final para comparar o recorte com o período anterior de mesma duração.</p>}
          {analytical && data.moderation && <section className="rc-board-moderation" aria-labelledby={`${id}-moderation-title`}>
            <header><span className="rc-board-eyebrow">Operação da equipe</span><h2 id={`${id}-moderation-title`}>Indicadores da moderação</h2><p>Os valores consideram o mesmo período e os mesmos filtros aplicados ao board.</p></header>
            <dl>
              <div><dt>Pendentes</dt><dd>{data.moderation.pending}</dd></div>
              <div><dt>Aprovadas</dt><dd>{data.moderation.approved}</dd></div>
              <div><dt>Rejeitadas</dt><dd>{data.moderation.rejected}</dd></div>
              <div><dt>Conteúdos censurados</dt><dd>{data.moderation.censoredTotal}</dd><small>{data.moderation.censoredReports} em denúncias · {data.moderation.censoredComments} em comentários</small></div>
            </dl>
            <div className="rc-board-rejection-reasons">
              <h3>Principais motivos de rejeição</h3>
              {data.moderation.rejectionReasons?.length
                ? <ol>{data.moderation.rejectionReasons.map(item => <li key={item.label}><span>{item.label}</span><strong>{item.total}</strong></li>)}</ol>
                : <p>Não há motivos de rejeição neste recorte.</p>}
            </div>
          </section>}
          {aggregated && <BoardCharts summary={data.summary} categories={data.breakdown?.categories || []} neighborhoods={data.breakdown?.neighborhoods || []} trend={data.trend || []} categoryTrend={analytical ? data.categoryTrend : null} community={community} />}
          {!data.summary.total && <div className="rc-board-state"><p>{aggregated ? 'Nenhuma denúncia encontrada para os filtros aplicados.' : 'Você ainda não tem denúncias para acompanhar.'}</p>{!aggregated && <Link className="btn btn-primary" to="/nova-denuncia">Registrar denúncia</Link>}</div>}
          {aggregated && <BoardMap heatmap={heatmap} loading={heatmapLoading} error={heatmapError} onRetry={() => setReload(value => value + 1)} />}
          {aggregated && data.breakdown && <div className="rc-board-breakdowns">
            {Object.entries(BREAKDOWN_LABELS).map(([key, labels]) => <section key={key}>
              <table><caption>{labels.title}</caption><thead><tr><th scope="col">{labels.column}</th><th scope="col">Total</th></tr></thead><tbody>{(data.breakdown[key] || []).map(item => <tr key={item.label}><th scope="row">{item.label}</th><td>{item.total}</td></tr>)}</tbody></table>
              {!data.breakdown[key]?.length && <p>Sem registros neste recorte.</p>}
            </section>)}
          </div>}
          <p className="rc-board-guidance">As colunas mostram a situação atual. Abra um cartão para consultar os detalhes.</p>
          <div className={`rc-board-columns${community ? ' is-community' : ''}`} role="region" tabIndex={0} aria-label="Denúncias por situação">
            {data.columns.map(column => <section className={`rc-board-column is-${column.key}`} key={column.key} aria-labelledby={`${id}-${column.key}`}>
              <header><h2 id={`${id}-${column.key}`}>{column.label}</h2><span aria-label={`${column.total} denúncias`}>{column.total}</span></header>
              {!column.reports.length && <p className="rc-board-column-empty">Nenhuma denúncia nesta etapa.</p>}
              <ul className="rc-board-cards">
                {column.reports.map(report => <li key={report.id}><article className="rc-board-card">
                  <div className="rc-board-card-meta"><span>#{report.id}</span><time dateTime={report.createdAt}>{dateLabel(report.createdAt)}</time></div>
                  <h3>{report.titulo}</h3><span className="rc-board-category">{report.categoria}</span>
                  <p><i className="bi bi-geo-alt" aria-hidden="true" /> {report.localizacao}</p>
                  <small className="d-block">Bairro: {report.bairro || 'Não informado'}</small>
                  <small>{report.setorResponsavel || 'Setor ainda não definido'}</small>
                  <button className="btn btn-outline-primary btn-sm mt-3" onClick={() => setSelected({ ...report, columnLabel: column.label })} aria-label={`Ver detalhes: ${report.titulo}`}>Ver detalhes</button>
                </article></li>)}
              </ul>
              {columnErrors[column.key] && <p role="alert" className="text-danger">{columnErrors[column.key]}</p>}
              {column.total > 0 && <p className="rc-board-column-count" role="status">Mostrando {column.reports.length} de {column.total}</p>}
              {column.page < column.totalPages && <button className="btn btn-outline-secondary w-100" onClick={() => loadMore(column)} disabled={loadingColumns[column.key]} aria-label={`Carregar mais: ${column.label}`}>{loadingColumns[column.key] ? 'Carregando...' : 'Carregar mais'}</button>}
            </section>)}
          </div>
        </>}
    </main>
    <Footer />
    {selected && <div className="rc-board-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${id}-detail-title`} className="rc-board-dialog">
        <header><div><small>Denúncia #{selected.id} · {selected.columnLabel}</small><h2 id={`${id}-detail-title`}>{selected.titulo}</h2></div><button className="btn btn-outline-secondary" aria-label="Fechar detalhes" onClick={() => setSelected(null)}>×</button></header>
        <p className="rc-board-description">{selected.descricao}</p>
        <dl><dt>Localização</dt><dd>{selected.localizacao}</dd><dt>Bairro</dt><dd>{selected.bairro || 'Não informado'}</dd><dt>Categoria</dt><dd>{selected.categoria}</dd><dt>Setor responsável</dt><dd>{selected.setorResponsavel || 'Ainda não definido'}</dd><dt>Registrada em</dt><dd>{dateLabel(selected.createdAt)}</dd><dt>Última atualização do andamento</dt><dd>{dateLabel(selected.resolucaoAtualizadaEm)}</dd>{analytical && <><dt>Última alteração do registro</dt><dd>{dateLabel(selected.updatedAt)}</dd></>}</dl>
        {selected.motivoRejeicao && <div className="alert alert-warning"><strong>Motivo da rejeição</strong><p className="mb-0">{selected.motivoRejeicao}</p></div>}
        {(!analytical || selected.status === 'aprovada') && <Link className="btn btn-primary" to={`/denuncia/${selected.id}`}>Abrir denúncia</Link>}
        {!analytical && selected.status === 'rejeitada' && <Link className="btn btn-outline-primary ms-2" to={`/editar-denuncia/${selected.id}`}>Corrigir denúncia</Link>}
      </section>
    </div>}
  </div>;
}
