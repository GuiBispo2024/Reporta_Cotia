import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import boardService from '../services/boardService';
import { AuthContext } from '../context/authContext';
import { friendlyError } from '../utils/errorMessage';
import { hasPermission, PERMISSIONS } from '../utils/accessControl';

const FILTER_LABELS = {
  categoria: 'Categoria',
  setorResponsavel: 'Setor',
  bairro: 'Bairro',
  dataInicio: 'Data inicial',
  dataFim: 'Data final'
};

const dateTimeLabel = value => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo'
}).format(new Date(value)).replace(',', '');

function AppliedFilters({ filters = {} }) {
  const active = Object.entries(filters).filter(([key, value]) => FILTER_LABELS[key] && value);
  if (!active.length) return <span className="rc-export-audit-no-filter">Todos os dados</span>;
  return <div className="rc-export-audit-filters">{active.map(([key, value]) => (
    <span key={key}><strong>{FILTER_LABELS[key]}:</strong> {value}</span>
  ))}</div>;
}

export default function HistoricoExportacoes() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const canViewAudit = hasPermission(user, PERMISSIONS.DASHBOARD_AUDIT_VIEW);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    if (!canViewAudit) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    boardService.getExportHistory({ page, limit: 20, sort })
      .then(result => {
        if (!active) return;
        setHistory(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 1);
      })
      .catch(err => {
        if (active) setError(friendlyError(err, 'Não foi possível carregar a auditoria de exportações. Tente novamente.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [canViewAudit, page, sort]);

  if (!canViewAudit) return null;

  const changeSort = event => {
    setPage(1);
    setSort(event.target.value);
  };

  return <div className="rc-page">
    <Navbar />
    <main tabIndex={-1} id="main-content" className="container py-4 flex-grow-1">
      <button type="button" className="btn btn-link px-0 mb-3" onClick={() => navigate('/boards/analitico')}><i aria-hidden="true" className="bi bi-arrow-left me-1" />Voltar para o board analítico</button>

      <header className="rc-section-header">
        <div><span className="rc-eyebrow">SEGURANÇA E RASTREABILIDADE</span><h1>Auditoria de exportações</h1><p>Consulte quem gerou planilhas, quais filtros foram utilizados e quantos registros foram exportados.</p></div>
        <div className="rc-users-total"><strong>{total}</strong><span>{total === 1 ? 'exportação' : 'exportações'}</span></div>
      </header>

      <section className="rc-role-history-toolbar" aria-label="Ordenação da auditoria">
        <div className="rc-role-history-filter-heading"><span><i aria-hidden="true" className="bi bi-file-earmark-spreadsheet" /></span><div><h2>Ordenar exportações</h2><p>Escolha a ordem de exibição pela data de geração.</p></div></div>
        <label><span>Ordenar por data</span><select className="form-select" value={sort} onChange={changeSort}><option value="newest">Mais recentes primeiro</option><option value="oldest">Mais antigas primeiro</option></select></label>
      </section>

      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

      <section className="rc-role-history-card mt-3" aria-busy={loading}>
        {loading ? <div className="text-center py-5"><div role="status" aria-label="Carregando" className="spinner-border text-primary" /><p className="text-muted mt-3">Carregando auditoria...</p></div>
        : !history.length ? <div className="rc-empty"><i aria-hidden="true" className="bi bi-file-earmark-spreadsheet" /><strong>Nenhuma exportação registrada</strong><span>As próximas planilhas geradas aparecerão neste histórico.</span></div>
        : <div className="table-responsive"><table className="table rc-role-history-table align-middle mb-0">
          <thead><tr><th>Responsável</th><th>Filtros aplicados</th><th>Registros</th><th>Formato</th><th>Data e hora</th></tr></thead>
          <tbody>{history.map(item => <tr key={item.id}>
            <td><div className="rc-role-history-person"><span>{item.user?.username?.charAt(0).toUpperCase() || '?'}</span><strong>{item.user?.username || 'Usuário removido'}</strong></div></td>
            <td><AppliedFilters filters={item.filters} /></td>
            <td><strong>{item.recordCount}</strong></td>
            <td><span className="rc-export-audit-format">{item.format?.toUpperCase()}</span></td>
            <td><time dateTime={item.createdAt}>{dateTimeLabel(item.createdAt)}</time></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      {totalPages > 1 && <nav className="rc-pagination" aria-label="Paginação da auditoria"><button type="button" className="btn btn-outline-primary" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" className="btn btn-outline-primary" disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)}>Próxima</button></nav>}
    </main>
    <Footer />
  </div>;
}
