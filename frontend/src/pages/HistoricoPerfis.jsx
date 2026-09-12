import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import userService from '../services/userService'
import { AuthContext } from '../context/authContext'
import { friendlyError } from '../utils/errorMessage'
import { hasPermission, PERMISSIONS } from '../utils/accessControl'

const ROLE_LABELS = {
  CITIZEN: 'Cidadão',
  MODERATOR: 'Moderador',
  ANALYST: 'Analista',
  ADMIN: 'Administrador'
}

function RoleList({ roles, emptyLabel }) {
  if (!roles?.length) return <span className="rc-role-history-empty">{emptyLabel}</span>
  return <div className="rc-role-badges">{roles.map(role => (
    <span className={`rc-role-badge is-${role.toLowerCase()}`} key={role}>{ROLE_LABELS[role] || role}</span>
  ))}</div>
}

export default function HistoricoPerfis() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const canViewAudit = hasPermission(user, PERMISSIONS.AUDIT_VIEW)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    if (!canViewAudit) return undefined
    let active = true

    setLoading(true)
    setError('')
    userService.getRoleHistory({
        page,
        limit: 20,
        sort
      })
      .then(result => {
        if (!active) return
        setHistory(result.data || [])
        setTotal(result.total || 0)
        setTotalPages(result.totalPages || 1)
      })
      .catch(err => {
        if (active) setError(friendlyError(err, 'Não foi possível carregar o histórico de perfis. Tente novamente.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [canViewAudit, page, sort])

  if (!canViewAudit) return null

  const changeSort = event => {
    setPage(1)
    setSort(event.target.value)
  }

  return <div className="rc-page">
    <Navbar />
    <main id="main-content" className="container py-4 flex-grow-1">
      <button type="button" className="btn btn-link px-0 mb-3" onClick={() => navigate('/lista-de-usuarios')}><i className="bi bi-arrow-left me-1" />Voltar para usuários</button>

      <header className="rc-section-header">
        <div><span className="rc-eyebrow">SEGURANÇA E RASTREABILIDADE</span><h1>Histórico de perfis</h1><p>Acompanhe quem alterou os acessos dos usuários e quais perfis foram modificados.</p></div>
        <div className="rc-users-total"><strong>{total}</strong><span>{total === 1 ? 'alteração' : 'alterações'}</span></div>
      </header>

      <section className="rc-role-history-toolbar" aria-label="Ordenação do histórico">
        <div className="rc-role-history-filter-heading"><span><i className="bi bi-calendar3" /></span><div><h2>Ordenar histórico</h2><p>Escolha a ordem de exibição pela data da alteração.</p></div></div>
        <label><span>Ordenar por data</span><select className="form-select" value={sort} onChange={changeSort}><option value="newest">Mais recentes primeiro</option><option value="oldest">Mais antigos primeiro</option></select></label>
      </section>

      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

      <section className="rc-role-history-card mt-3" aria-busy={loading}>
        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-3">Carregando histórico...</p></div>
        : !history.length ? <div className="rc-empty"><i className="bi bi-clock-history" /><strong>Nenhuma alteração encontrada</strong><span>Ajuste os filtros ou aguarde uma mudança de perfil.</span></div>
        : <div className="table-responsive"><table className="table rc-role-history-table align-middle mb-0">
          <thead><tr><th>Usuário alterado</th><th>Perfis anteriores</th><th>Novos perfis</th><th>Responsável</th><th>Data e hora</th></tr></thead>
          <tbody>{history.map(item => <tr key={item.id}>
            <td><div className="rc-role-history-person"><span>{item.targetUsername?.charAt(0).toUpperCase() || '?'}</span><strong>{item.targetUsername}</strong></div></td>
            <td><RoleList roles={item.previousRoles} emptyLabel="Sem perfil" /></td>
            <td><RoleList roles={item.newRoles} emptyLabel="Sem perfil" /></td>
            <td><strong>{item.changedByUsername}</strong></td>
            <td><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('pt-BR')}</time></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      {totalPages > 1 && <nav className="rc-pagination" aria-label="Paginação do histórico"><button type="button" className="btn btn-outline-primary" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" className="btn btn-outline-primary" disabled={page >= totalPages || loading} onClick={() => setPage(value => value + 1)}>Próxima</button></nav>}
    </main>
    <Footer />
  </div>
}
