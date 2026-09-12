import { useCallback, useEffect, useMemo, useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import userService from '../services/userService'
import { AuthContext } from '../context/authContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import UserAvatar from '../components/UserAvatar'
import { friendlyError } from '../utils/errorMessage'
import { hasPermission, PERMISSIONS } from '../utils/accessControl'

const ROLE_LABELS = { CITIZEN: 'Cidadão', MODERATOR: 'Moderador', ANALYST: 'Analista', ADMIN: 'Administrador' }
const ROLE_ICONS = { CITIZEN: 'bi-person-check', MODERATOR: 'bi-shield-check', ANALYST: 'bi-bar-chart', ADMIN: 'bi-shield-lock' }
const normalizeRoles = roles => (roles || []).map(role => typeof role === 'string' ? role : role.name)

export default function ListaDeUsuários() {
  const { user, setUser } = useContext(AuthContext)
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('username')
  const [totalUsers, setTotalUsers] = useState(0)
  const [availableRoles, setAvailableRoles] = useState([])
  const [rolesError, setRolesError] = useState('')
  const [rolesLoading, setRolesLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedRoles, setSelectedRoles] = useState([])
  const [savingRoles, setSavingRoles] = useState(false)

  const canManageRoles = hasPermission(user, PERMISSIONS.USERS_MANAGE_ROLES)
  const canViewAudit = hasPermission(user, PERMISSIONS.AUDIT_VIEW)

  const carregar = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await userService.getAllWithDenunciaCount({ page, limit: 20, search, sort })
      setUsers(result.data || [])
      setTotalPages(result.totalPages || 1)
      setTotalUsers(result.total || 0)
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível carregar a comunidade. Atualize a página para tentar novamente.'))
    } finally { setLoading(false) }
  }, [page, search, sort])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!canManageRoles) return
    let active = true
    setRolesLoading(true)
    setRolesError('')
    userService.getAvailableRoles()
      .then(roles => { if (active) setAvailableRoles(roles || []) })
      .catch(err => { if (active) setRolesError(friendlyError(err, 'Não foi possível carregar os perfis de acesso.')) })
      .finally(() => { if (active) setRolesLoading(false) })
    return () => { active = false }
  }, [canManageRoles])

  const currentRoles = useMemo(() => normalizeRoles(selectedUser?.roles), [selectedUser])
  const hasChanges = useMemo(() => [...currentRoles].sort().join(',') !== [...selectedRoles].sort().join(','), [currentRoles, selectedRoles])

  const abrirPerfis = selected => {
    setNotice('')
    setRolesError('')
    setSelectedUser(selected)
    const roles = normalizeRoles(selected.roles)
    setSelectedRoles(roles.includes('CITIZEN') ? roles : ['CITIZEN', ...roles])
  }

  const fecharPerfis = () => {
    if (savingRoles) return
    setSelectedUser(null)
    setSelectedRoles([])
  }

  const alternarPerfil = roleName => {
    const isOwnAdmin = Number(selectedUser?.id) === Number(user?.id) && roleName === 'ADMIN'
    if (roleName === 'CITIZEN' || isOwnAdmin) return
    setSelectedRoles(current => current.includes(roleName) ? current.filter(role => role !== roleName) : [...current, roleName])
  }

  const salvarPerfis = async () => {
    if (!selectedUser || !hasChanges) return
    try {
      setSavingRoles(true)
      setRolesError('')
      const result = await userService.updateRoles(selectedUser.id, selectedRoles)
      const updatedUser = result.user
      setUsers(current => current.map(item => Number(item.id) === Number(updatedUser.id) ? { ...item, roles: updatedUser.roles } : item))
      if (Number(updatedUser.id) === Number(user?.id)) setUser(current => ({ ...current, ...updatedUser }))
      setNotice(result.message || `Os perfis de ${selectedUser.username} foram atualizados.`)
      setSelectedUser(null)
      setSelectedRoles([])
    } catch (err) {
      setRolesError(friendlyError(err, 'Não foi possível atualizar os perfis. Nenhuma alteração foi realizada.'))
    } finally { setSavingRoles(false) }
  }

  return <div className="rc-page">
    <Navbar />
    <main className="container py-4 flex-grow-1">
      <header className="rc-section-header">
        <div><span className="rc-eyebrow">COMUNIDADE</span><h1>Usuários do Reporta Cotia</h1><p>Conheça quem participa e quantas denúncias aprovadas cada pessoa publicou.</p></div>
        <div className="rc-section-header-actions">
          {canViewAudit && <button type="button" className="btn rc-audit-link" onClick={() => navigate('/administracao/historico-perfis')}><i className="bi bi-clock-history" /> Histórico de perfis</button>}
          <div className="rc-users-total"><strong>{totalUsers}</strong><span>participantes</span></div>
        </div>
      </header>

      {notice && <div className="alert alert-success rc-users-message" role="status"><i className="bi bi-check-circle" />{notice}<button type="button" aria-label="Fechar mensagem" onClick={() => setNotice('')}><i className="bi bi-x" /></button></div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {canManageRoles && rolesError && !selectedUser && <div className="alert alert-warning">{rolesError}</div>}

      <div className="rc-community-filters">
        <div className="rc-community-search"><i className="bi bi-search" /><input className="form-control" placeholder="Buscar participante" aria-label="Buscar participante" value={search} onChange={event => { setPage(1); setSearch(event.target.value) }} /></div>
        <select className="form-select" aria-label="Ordenar participantes" value={sort} onChange={event => { setPage(1); setSort(event.target.value) }}><option value="username">Ordenar por nome</option><option value="contributions">Mais contribuições</option></select>
      </div>

      {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-3">Carregando participantes...</p></div> : !users.length ? <div className="rc-empty">Nenhum usuário encontrado.</div> :
      <div className="rc-users-card"><div className="table-responsive"><table className="table rc-users-table align-middle mb-0">
        <thead><tr><th>Participante</th>{canManageRoles && <th>E-mail</th>}<th>Contribuições</th><th>Perfis</th>{canManageRoles && <th className="text-end">Ações</th>}</tr></thead>
        <tbody>{users.map(item => {
          const itemRoles = normalizeRoles(item.roles)
          return <tr key={item.id}>
            <td><button className="rc-user-cell rc-user-profile-link" onClick={() => navigate(`/usuarios/${item.id}`)}><UserAvatar user={item} className="rc-user-avatar" /><strong>{item.username}</strong>{Number(item.id) === Number(user?.id) && <span className="rc-you-badge">Você</span>}</button></td>
            {canManageRoles && <td className="text-muted">{item.email}</td>}
            <td><span className="rc-contribution"><i className="bi bi-megaphone" /> {item.totalDenuncias || 0}</span></td>
            <td><div className="rc-role-badges">{(itemRoles.length ? itemRoles : ['CITIZEN']).map(role => <span className={`rc-role-badge is-${role.toLowerCase()}`} key={role}>{ROLE_LABELS[role] || role}</span>)}</div></td>
            {canManageRoles && <td className="text-end"><button className="btn btn-sm btn-outline-primary rc-manage-roles-button" disabled={rolesLoading || !availableRoles.length} onClick={() => abrirPerfis(item)}><i className="bi bi-person-gear" />{rolesLoading ? 'Carregando...' : 'Gerenciar perfis'}</button></td>}
          </tr>
        })}</tbody>
      </table></div></div>}

      {totalPages > 1 && <div className="d-flex justify-content-center gap-3 mt-3"><button className="btn btn-outline-primary" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span className="align-self-center">Página {page} de {totalPages}</span><button className="btn btn-outline-primary" disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Próxima</button></div>}
    </main>

    {selectedUser && <div className="rc-role-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) fecharPerfis() }}>
      <section className="rc-role-modal" role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
        <header><div className="rc-role-modal-user"><UserAvatar user={selectedUser} className="rc-user-avatar" /><div><span>Gerenciar acesso</span><h2 id="role-modal-title">{selectedUser.username}</h2></div></div><button type="button" className="rc-role-modal-close" aria-label="Fechar" onClick={fecharPerfis}><i className="bi bi-x-lg" /></button></header>
        <p className="rc-role-modal-help">Selecione os perfis adequados às responsabilidades deste usuário. As permissões são aplicadas imediatamente.</p>
        {rolesError && <div className="alert alert-danger">{rolesError}</div>}
        <div className="rc-role-options">{availableRoles.map(role => {
          const checked = selectedRoles.includes(role.name)
          const locked = role.name === 'CITIZEN' || (Number(selectedUser.id) === Number(user?.id) && role.name === 'ADMIN' && checked)
          return <label className={`rc-role-option ${checked ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`} key={role.name}>
            <input type="checkbox" checked={checked} disabled={locked || savingRoles} onChange={() => alternarPerfil(role.name)} />
            <span className="rc-role-option-icon"><i className={`bi ${ROLE_ICONS[role.name] || 'bi-person'}`} /></span>
            <span className="rc-role-option-text"><strong>{ROLE_LABELS[role.name] || role.name}</strong><small>{role.description}</small>{locked && <em><i className="bi bi-lock" /> {role.name === 'CITIZEN' ? 'Perfil básico obrigatório' : 'Sua administração está protegida'}</em>}</span>
            <span className="rc-role-option-check"><i className={`bi ${checked ? 'bi-check-circle-fill' : 'bi-circle'}`} /></span>
          </label>
        })}</div>
        <footer><button type="button" className="btn btn-outline-secondary" disabled={savingRoles} onClick={fecharPerfis}>Cancelar</button><button type="button" className="btn btn-primary" disabled={!hasChanges || savingRoles} onClick={salvarPerfis}>{savingRoles ? <><span className="spinner-border spinner-border-sm" /> Salvando...</> : <><i className="bi bi-check2" /> Salvar perfis</>}</button></footer>
      </section>
    </div>}
    <Footer />
  </div>
}
