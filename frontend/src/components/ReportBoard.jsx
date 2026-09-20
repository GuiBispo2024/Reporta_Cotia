import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import boardService from '../services/boardService';
import { friendlyError } from '../utils/errorMessage';
import useDialogAccessibility from '../hooks/useDialogAccessibility';
import Navbar from './Navbar';
import Footer from './Footer';
import './ReportBoard.css';

const SUMMARY_LABELS = { total: 'Total de denúncias', pendente: 'Em moderação', aberta: 'Abertas', em_andamento: 'Em andamento', resolvida: 'Resolvidas', rejeitada: 'Rejeitadas' };
const BREAKDOWN_LABELS = {
  categories: { title: 'Denúncias por categoria', column: 'Categoria' },
  sectors: { title: 'Denúncias por setor', column: 'Setor' },
  locations: { title: 'Denúncias por localização', column: 'Localização' }
};
const dateLabel = value => value ? new Date(value).toLocaleDateString('pt-BR') : 'Não informada';

export default function ReportBoard({ analytical = false, community = false }) {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [loadingColumns, setLoadingColumns] = useState({});
  const [columnErrors, setColumnErrors] = useState({});
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ categoria: '', setorResponsavel: '' });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({ categories: [], sectors: [] });
  const revision = useRef(0);
  const requestController = useRef(null);
  const pendingColumns = useRef(new Set());
  const dialogRef = useDialogAccessibility(!!selected, () => setSelected(null));

  useEffect(() => {
    const version = ++revision.current;
    const controller = new AbortController();
    requestController.current = controller;
    pendingColumns.current.clear();
    setData(null);
    setLoading(true);
    setError('');
    setColumnErrors({});
    setLoadingColumns({});
    setSelected(null);
    boardService.getBoard({ analytical, community, params: aggregated ? appliedFilters : {}, signal: controller.signal })
      .then(result => {
        if (version !== revision.current) return;
        setData(result);
        if (result.breakdown && !appliedFilters.categoria && !appliedFilters.setorResponsavel) setFilterOptions(result.breakdown);
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

  return <div className="rc-page">
    <Navbar />
    <main id="main-content" tabIndex={-1} className="container-fluid rc-board-page py-4 flex-grow-1">
      <header className="rc-board-header">
        <div><span className="rc-board-eyebrow">{viewCopy.eyebrow}</span><h1>{viewCopy.title}</h1><p>{viewCopy.description}</p></div>
        <div className="d-flex flex-wrap gap-2"><Link className="btn btn-outline-primary" to={aggregated ? '/meu-board' : '/minhas-denuncias'}>{aggregated ? 'Meu board pessoal' : 'Ver em lista'}</Link><button className="btn btn-outline-secondary" onClick={() => setReload(value => value + 1)} disabled={loading}>Atualizar</button></div>
      </header>

      {aggregated && <form className="rc-board-filters" onSubmit={event => { event.preventDefault(); setAppliedFilters({ ...filters }); }}>
        <label htmlFor={`${id}-category`}>Categoria<select id={`${id}-category`} className="form-select" value={filters.categoria} onChange={event => setFilters(current => ({ ...current, categoria: event.target.value }))}><option value="">Todas as categorias</option>{filterOptions.categories.map(item => <option key={item.label}>{item.label}</option>)}</select></label>
        <label htmlFor={`${id}-sector`}>Setor responsável<select id={`${id}-sector`} className="form-select" value={filters.setorResponsavel} onChange={event => setFilters(current => ({ ...current, setorResponsavel: event.target.value }))}><option value="">Todos os setores</option>{filterOptions.sectors.filter(item => item.label !== 'Não informado').map(item => <option key={item.label}>{item.label}</option>)}</select></label>
        <button className="btn btn-primary" disabled={loading}>Aplicar filtros</button>
        <button type="button" className="btn btn-outline-secondary" disabled={loading || (!filters.categoria && !filters.setorResponsavel && !appliedFilters.categoria && !appliedFilters.setorResponsavel)} onClick={() => { setFilters({ categoria: '', setorResponsavel: '' }); setAppliedFilters({}); }}>Limpar filtros</button>
      </form>}

      {loading ? <p role="status" className="rc-board-state">Carregando denúncias...</p>
        : error ? <div role="alert" className="alert alert-danger">{error}<button className="btn btn-outline-danger ms-2" onClick={() => setReload(value => value + 1)}>Tentar novamente</button></div>
        : data && <>
          <dl className="rc-board-summary" aria-label="Resumo das denúncias">
            {visibleSummaryLabels.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{data.summary[key]}</dd></div>)}
            {aggregated && <div><dt>Resolução das aprovadas</dt><dd>{data.summary.resolutionRate}%</dd></div>}
          </dl>
          {aggregated && <p className="rc-board-guidance">{community ? 'Os indicadores consideram somente denúncias aprovadas e não exibem conteúdos em moderação ou rejeitados.' : 'Os indicadores consideram todas as denúncias dos filtros aplicados. A taxa de resolução considera somente as aprovadas.'}</p>}
          {!data.summary.total && <div className="rc-board-state"><p>{aggregated ? 'Nenhuma denúncia encontrada para os filtros aplicados.' : 'Você ainda não tem denúncias para acompanhar.'}</p>{!aggregated && <Link className="btn btn-primary" to="/nova-denuncia">Registrar denúncia</Link>}</div>}
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
        <dl><dt>Localização</dt><dd>{selected.localizacao}</dd><dt>Categoria</dt><dd>{selected.categoria}</dd><dt>Setor responsável</dt><dd>{selected.setorResponsavel || 'Ainda não definido'}</dd><dt>Registrada em</dt><dd>{dateLabel(selected.createdAt)}</dd><dt>Última atualização do andamento</dt><dd>{dateLabel(selected.resolucaoAtualizadaEm)}</dd>{analytical && <><dt>Última alteração do registro</dt><dd>{dateLabel(selected.updatedAt)}</dd></>}</dl>
        {selected.motivoRejeicao && <div className="alert alert-warning"><strong>Motivo da rejeição</strong><p className="mb-0">{selected.motivoRejeicao}</p></div>}
        {(!analytical || selected.status === 'aprovada') && <Link className="btn btn-primary" to={`/denuncia/${selected.id}`}>Abrir denúncia</Link>}
        {!analytical && selected.status === 'rejeitada' && <Link className="btn btn-outline-primary ms-2" to={`/editar-denuncia/${selected.id}`}>Corrigir denúncia</Link>}
      </section>
    </div>}
  </div>;
}
