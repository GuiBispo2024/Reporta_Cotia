import { useCallback, useEffect, useState, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import denunciaService from "../services/denunciaService";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/authContext";
import Footer from "../components/Footer";
import ResolutionTimeline from "../components/ResolutionTimeline";
import { friendlyError } from '../utils/errorMessage';
import ImageCarousel from '../components/ImageCarousel';
import { hasPermission, PERMISSIONS } from '../utils/accessControl';

const SETORES = [
  'Secretaria de Infraestrutura e Obras',
  'Secretaria de Mobilidade e Trânsito',
  'Secretaria do Verde e Meio Ambiente',
  'Secretaria de Saúde',
  'Secretaria de Educação',
  'Secretaria de Segurança Pública',
  'Serviço de Iluminação Pública',
  'Limpeza Urbana e Zeladoria',
  'Defesa Civil',
  'A definir'
];

export default function Moderacao() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [denuncias, setDenuncias] = useState([]);
  const [aprovadas, setAprovadas] = useState([]);
  const [rejeitadas, setRejeitadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [motivos, setMotivos] = useState({});
  const [pendingMeta, setPendingMeta] = useState({ page: 1, totalPages: 1 });
  const [approvedMeta, setApprovedMeta] = useState({ page: 1, totalPages: 1 });
  const [rejectedMeta, setRejectedMeta] = useState({ page: 1, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('todos');
  const [resolutionFilter, setResolutionFilter] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState({});
  const [savingResolution, setSavingResolution] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const canViewModeration = hasPermission(user, PERMISSIONS.MODERATION_VIEW);
  const canReviewModeration = hasPermission(user, PERMISSIONS.MODERATION_REVIEW);
  const canReviewCensorship = hasPermission(user, PERMISSIONS.CENSORSHIP_REVIEW);
  const canUpdateResolution = hasPermission(user, PERMISSIONS.RESOLUTION_UPDATE);
  const canViewAudit = hasPermission(user, PERMISSIONS.AUDIT_VIEW);

  const hasResolutionChanges = report => {
    const draft = resolutionDetails[report.id] || {};
    return (draft.resolucaoStatus || 'aberta') !== (report.resolucaoStatus || 'aberta') ||
      (draft.setorResponsavel || '') !== (report.setorResponsavel || '');
  };

  const carregar = useCallback(async (pendingPage = 1, approvedPage = 1, rejectedPage = 1, approvedResolution = resolutionFilter) => {
    try {
      setLoading(true);
      const [pending, approved, rejected] = await Promise.all([
        denunciaService.listarParaModeracao({ status: 'pendente', page: pendingPage, limit: 12 }),
        denunciaService.listarParaModeracao({ status: 'aprovada', ...(approvedResolution ? { resolucaoStatus: approvedResolution } : {}), page: approvedPage, limit: 12 }),
        denunciaService.listarParaModeracao({ status: 'rejeitada', page: rejectedPage, limit: 12 })
      ]);
      setDenuncias(pending.data || []);
      setAprovadas(approved.data || []);
      setRejeitadas(rejected.data || []);
      setResolutionDetails(current => Object.fromEntries((approved.data || []).map(report => [
        report.id,
        current[report.id] || {
          resolucaoStatus: report.resolucaoStatus || 'aberta',
          setorResponsavel: report.setorResponsavel || ''
        }
      ])));
      setPendingMeta({ page: pending.page || 1, totalPages: pending.totalPages || 1 });
      setApprovedMeta({ page: approved.page || 1, totalPages: approved.totalPages || 1 });
      setRejectedMeta({ page: rejected.page || 1, totalPages: rejected.totalPages || 1 });
    } catch (error) { setError(friendlyError(error, "Não foi possível carregar o painel de moderação. Atualize a página para tentar novamente.")); }
    finally { setLoading(false); }
  }, [resolutionFilter]);

  useEffect(() => { if (canViewModeration) carregar(); }, [canViewModeration, carregar]);

  const moderar = async (id, status) => {
    try {
      const response = await denunciaService.moderar(id, {
        status,
        motivoRejeicao: status === 'rejeitada' ? motivos[id] || '' : ''
      });

      if (status === 'rejeitada') {
        const nextPendingPage = denuncias.length === 1 && pendingMeta.page > 1
          ? pendingMeta.page - 1
          : pendingMeta.page;
        setSelectedReport(null);
        setMotivos(current => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        await carregar(nextPendingPage, approvedMeta.page, 1);
        return;
      }

      setDenuncias(prev =>
        prev.filter(d => d.id !== id)
      );

      if (status === "aprovada") {
        setAprovadas(prev => [
          response.denuncia,
          ...prev
        ]);
      }
      setSelectedReport(null);
    } catch (err) {
      alert(
        friendlyError(err, "Não foi possível atualizar a moderação. A denúncia permaneceu no estado anterior.")
      );
    }
  };

  const revisarCensura = async (id, field, manterCensura) => {
    try {
      const result = await denunciaService.revisarCensura(id, field, manterCensura);
      setDenuncias(prev => prev.map(d => d.id === id ? {
        ...d,
        [field]: result.value,
        [field === 'titulo' ? 'tituloCensurado' : 'descricaoCensurada']: result.censurado,
        [field === 'titulo' ? 'tituloOriginal' : 'descricaoOriginal']: null
      } : d));
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível registrar a revisão da censura.'));
    }
  };

  const atualizarResolucao = async (id) => {
    const details = resolutionDetails[id] || {};
    const resolucaoStatus = details.resolucaoStatus || 'aberta';
    try {
      setSavingResolution(id);
      const result = await denunciaService.atualizarResolucao(
        id,
        resolucaoStatus,
        { setorResponsavel: details.setorResponsavel || '' }
      );

      setAprovadas(prev =>
        prev.map(d =>
          d.id === id
            ? {
                ...d,
                resolucaoStatus: result.resolucaoStatus,
                setorResponsavel: result.setorResponsavel
              }
            : d
        )
      );
      setSelectedReport(current => current?.id === id ? {
        ...current,
        resolucaoStatus: result.resolucaoStatus,
        setorResponsavel: result.setorResponsavel
      } : current);
    } catch (err) {
      alert(
        friendlyError(err, "Não foi possível atualizar o andamento. O status anterior foi mantido.")
      );
    } finally { setSavingResolution(null); }
  };

  const reabrirModeracao = async id => {
    if (!window.confirm('Reenviar esta denúncia para a fila de moderação?')) return;
    try {
      await denunciaService.moderar(id, { status: 'pendente' });
      setSelectedReport(null);
      await carregar(pendingMeta.page, approvedMeta.page, rejectedMeta.page);
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível reabrir a moderação.'));
    }
  };

  if (!canViewModeration) return null;

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <div className="text-center mb-4">
          <span className="rc-eyebrow">PAINEL DE MODERAÇÃO</span>
          <h2 className="fw-bold">Moderação</h2>
          <p className="text-muted">Aprove ou rejeite novos registros antes da publicação.</p>
        </div>

        <div className="rc-moderation-filter mb-4">
          <div><i className="bi bi-funnel" /><div><strong>Filtrar denúncias</strong><small>Exiba apenas o status que deseja analisar.</small></div></div>
          <div className="rc-moderation-filter-fields">
            <label><span>Status de moderação</span><select className="form-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="todos">Todos os status</option><option value="pendente">Pendentes</option><option value="aprovada">Aprovadas</option><option value="rejeitada">Rejeitadas</option></select></label>
            <label className={statusFilter === 'pendente' || statusFilter === 'rejeitada' ? 'd-none' : ''}><span>Andamento das aprovadas</span><select className="form-select" value={resolutionFilter} onChange={event => setResolutionFilter(event.target.value)}><option value="">Todos os andamentos</option><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="resolvida">Resolvida</option></select></label>
          </div>
        </div>

        {loading && <div className="text-center"><div className="spinner-border text-primary" /></div>}
        {error && <div className="alert alert-danger">{error}</div>}
        <div className={statusFilter === 'todos' || statusFilter === 'pendente' ? '' : 'd-none'}>
        {!loading && !denuncias.length && <div className="rc-empty">Não há denúncias pendentes no momento.</div>}

        <div className="row g-4">
          {denuncias.map(d => (
            <div className="col-12 col-md-6 col-lg-4" key={d.id}>
              <article className="card rc-card h-100">
                <ImageCarousel images={d.imageUrls} fallback={d.imageUrl} alt={d.titulo} compact />
                <div className="card-body">
                  <span className="badge rc-category mb-2">{d.categoria || "Outros"}</span>
                  <h5 className="fw-bold">{d.titulo}</h5>
                  <p>{d.descricao}</p>
                  {canReviewCensorship && (d.tituloOriginal || d.descricaoOriginal) && <div className="rc-censorship-review">
                    <strong><i className="bi bi-eye" /> Revisão de conteúdo automático</strong>
                    {d.tituloOriginal && <div className="rc-censored-field"><small>Título original</small><p>{d.tituloOriginal}</p><div><button className="btn btn-sm btn-outline-danger" onClick={() => revisarCensura(d.id, 'titulo', true)}>Manter censura</button><button className="btn btn-sm btn-outline-success" onClick={() => revisarCensura(d.id, 'titulo', false)}>Retirar censura</button></div></div>}
                    {d.descricaoOriginal && <div className="rc-censored-field"><small>Descrição original</small><p>{d.descricaoOriginal}</p><div><button className="btn btn-sm btn-outline-danger" onClick={() => revisarCensura(d.id, 'descricao', true)}>Manter censura</button><button className="btn btn-sm btn-outline-success" onClick={() => revisarCensura(d.id, 'descricao', false)}>Retirar censura</button></div></div>}
                  </div>}
                  <p className="small"><strong>Local:</strong> {d.localizacao}</p>
                  <p className="small"><strong>Usuário:</strong> {d.User?.username || "Desconhecido"}</p>
                  <button className="btn btn-outline-primary btn-sm w-100 mb-2" onClick={() => setSelectedReport({ ...d, queue: 'pending' })}><i className="bi bi-eye me-1" />Ver detalhes da denúncia</button>
                  {canReviewModeration ? <><label className="form-label small fw-semibold mt-2">Motivo da rejeição <span className="text-danger">(obrigatório para rejeitar)</span></label>
                    <textarea className="form-control form-control-sm" rows="2" maxLength="1000" placeholder="Explique o que o cidadão pode corrigir..." value={motivos[d.id] || ''} onChange={e => setMotivos(prev => ({ ...prev, [d.id]: e.target.value }))} />
                    <div className="d-flex gap-2 mt-3"><button className="btn btn-success flex-fill" onClick={() => moderar(d.id, "aprovada")}>✅ Aprovar</button><button className="btn btn-danger flex-fill" disabled={!motivos[d.id]?.trim()} onClick={() => moderar(d.id, "rejeitada")}>❌ Rejeitar</button></div></> : <p className="rc-permission-note"><i className="bi bi-eye" /> Acesso somente para consulta.</p>}
                  {canViewAudit && <button className="btn btn-outline-secondary btn-sm mt-3" onClick={() => navigate(`/moderacao/denuncia/${d.id}/historico`)}><i className="bi bi-clock-history me-1" />Histórico de alterações</button>}
                </div>
              </article>
            </div>
          ))}
        </div>
        {pendingMeta.totalPages > 1 && <div className="d-flex justify-content-center gap-3 mt-3"><button className="btn btn-outline-primary" disabled={pendingMeta.page <= 1} onClick={() => carregar(pendingMeta.page - 1, approvedMeta.page, rejectedMeta.page)}>Anterior</button><span className="align-self-center">Página {pendingMeta.page} de {pendingMeta.totalPages}</span><button className="btn btn-outline-primary" disabled={pendingMeta.page >= pendingMeta.totalPages} onClick={() => carregar(pendingMeta.page + 1, approvedMeta.page, rejectedMeta.page)}>Próxima</button></div>}
        </div>

      <section className={`mt-5 ${statusFilter === 'todos' || statusFilter === 'aprovada' ? '' : 'd-none'}`}>

        <h4 className="fw-bold">
          {canUpdateResolution ? 'Atualizar resolução dos problemas' : 'Acompanhar resolução dos problemas'}
        </h4>

        <p className="text-muted">
          Atualize o andamento das denúncias que já
          foram aprovadas pela moderação.
        </p>

        {!aprovadas.length ? (
          <div className="rc-empty">
            Não há denúncias aprovadas para acompanhar.
          </div>
        ) : (
          <div className="row g-3">

            {aprovadas.map(d => (

              <div
                className="col-12 col-lg-6"
                key={`resolution-${d.id}`}
              >

                <div className="rc-filter-card">

                  <div className="d-flex justify-content-between">
                    <strong>{d.titulo}</strong>

                    <span className="badge bg-success">
                      Aprovada
                    </span>
                  </div>

                  <p className="small text-muted mt-2 mb-2">
                    <i className="bi bi-person-circle me-1" />

                    {d.User?.username ||
                      "Usuário não identificado"}
                  </p>

                  <ResolutionTimeline
                    status={d.resolucaoStatus}
                  />

                  <button className="btn btn-outline-primary btn-sm w-100 mt-2" onClick={() => setSelectedReport({ ...d, queue: 'approved' })}><i className="bi bi-eye me-1" />Ver detalhes e atualizar</button>

                  <label
                    className="form-label mt-3 fw-semibold"
                  >
                    Andamento
                  </label>

                  <select disabled={!canUpdateResolution}
                    className="form-select"
                    value={
                      resolutionDetails[d.id]?.resolucaoStatus || d.resolucaoStatus || "aberta"
                    }
                    onChange={event => setResolutionDetails(current => ({
                      ...current,
                      [d.id]: { ...current[d.id], resolucaoStatus: event.target.value }
                    }))}
                  >
                    <option value="aberta">
                      Aberta
                    </option>

                    <option value="em_andamento">
                      Em andamento
                    </option>

                    <option value="resolvida">
                      Resolvida
                    </option>
                  </select>
                  <label className="form-label mt-3 fw-semibold">Setor responsável</label>
                  <select className="form-select" disabled={!canUpdateResolution} value={resolutionDetails[d.id]?.setorResponsavel || ''} onChange={event => setResolutionDetails(current => ({ ...current, [d.id]: { ...current[d.id], setorResponsavel: event.target.value } }))}>
                    <option value="">Selecione um setor</option>
                    {SETORES.map(setor => <option value={setor} key={setor}>{setor}</option>)}
                  </select>
                  {canUpdateResolution && <button className="btn btn-primary mt-3 me-2" disabled={savingResolution === d.id || !hasResolutionChanges(d)} onClick={() => atualizarResolucao(d.id)}>
                    <i className="bi bi-check2-circle me-1" />{savingResolution === d.id ? 'Salvando...' : 'Salvar mudanças'}
                  </button>}
                  {canReviewModeration && <button className="btn btn-outline-warning btn-sm mt-3" onClick={() => reabrirModeracao(d.id)}><i className="bi bi-arrow-counterclockwise me-1" />Reabrir moderação</button>}
                  {canViewAudit && <button className="btn btn-outline-secondary btn-sm mt-3 ms-2" onClick={() => navigate(`/moderacao/denuncia/${d.id}/historico`)}><i className="bi bi-clock-history me-1" />Histórico de alterações</button>}

                </div>

              </div>

            ))}

          </div>
        )}
        {approvedMeta.totalPages > 1 && <div className="d-flex justify-content-center gap-3 mt-3"><button className="btn btn-outline-primary" disabled={approvedMeta.page <= 1} onClick={() => carregar(pendingMeta.page, approvedMeta.page - 1, rejectedMeta.page)}>Anterior</button><span className="align-self-center">Página {approvedMeta.page} de {approvedMeta.totalPages}</span><button className="btn btn-outline-primary" disabled={approvedMeta.page >= approvedMeta.totalPages} onClick={() => carregar(pendingMeta.page, approvedMeta.page + 1, rejectedMeta.page)}>Próxima</button></div>}
      </section>
      <section className={`mt-5 ${statusFilter === 'todos' || statusFilter === 'rejeitada' ? '' : 'd-none'}`}>
        <h4 className="fw-bold">Denúncias rejeitadas</h4>
        <p className="text-muted">Consulte os registros rejeitados ou reabra uma denúncia para uma nova análise.</p>
        {!rejeitadas.length ? <div className="rc-empty">Não há denúncias rejeitadas.</div> : <div className="row g-3">{rejeitadas.map(d => <div className="col-12 col-lg-6" key={`rejected-${d.id}`}><article className="rc-filter-card"><div className="d-flex justify-content-between gap-2"><strong>{d.titulo}</strong><span className="badge bg-danger">Rejeitada</span></div><p className="small text-muted mt-2"><i className="bi bi-person-circle me-1" />{d.User?.username || 'Usuário não identificado'}</p>{d.motivoRejeicao && <p className="rc-rejection-reason"><strong>Motivo:</strong> {d.motivoRejeicao}</p>}<button className="btn btn-outline-primary btn-sm" onClick={() => setSelectedReport({ ...d, queue: 'rejected' })}><i className="bi bi-eye me-1" />Ver detalhes</button>{canReviewModeration && <button className="btn btn-outline-warning btn-sm ms-2" onClick={() => reabrirModeracao(d.id)}><i className="bi bi-arrow-counterclockwise me-1" />Reabrir</button>}</article></div>)}</div>}
        {rejectedMeta.totalPages > 1 && <div className="d-flex justify-content-center gap-3 mt-3"><button className="btn btn-outline-primary" disabled={rejectedMeta.page <= 1} onClick={() => carregar(pendingMeta.page, approvedMeta.page, rejectedMeta.page - 1)}>Anterior</button><span className="align-self-center">Página {rejectedMeta.page} de {rejectedMeta.totalPages}</span><button className="btn btn-outline-primary" disabled={rejectedMeta.page >= rejectedMeta.totalPages} onClick={() => carregar(pendingMeta.page, approvedMeta.page, rejectedMeta.page + 1)}>Próxima</button></div>}
      </section>
      </main>
      {selectedReport && <div className="rc-moderation-detail-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedReport(null); }}>
        <section className="rc-moderation-detail" role="dialog" aria-modal="true" aria-labelledby="moderation-detail-title">
          <header className="rc-moderation-detail-header">
            <div><span className="rc-eyebrow">DENÚNCIA #{selectedReport.id}</span><h2 id="moderation-detail-title">Detalhes para moderação</h2></div>
            <button type="button" onClick={() => setSelectedReport(null)} aria-label="Fechar detalhes"><i className="bi bi-x-lg" /></button>
          </header>
          <div className="rc-moderation-detail-grid">
            <div className="rc-moderation-detail-content">
              <ImageCarousel images={selectedReport.imageUrls} fallback={selectedReport.imageUrl} alt={selectedReport.titulo} />
              <div className="rc-moderation-detail-badges"><span className="badge rc-category">{selectedReport.categoria || 'Outros'}</span><span className={`badge ${selectedReport.status === 'aprovada' ? 'bg-success' : selectedReport.status === 'rejeitada' ? 'bg-danger' : 'bg-warning text-dark'}`}>{selectedReport.status}</span></div>
              <h3>{selectedReport.titulo}</h3>
              <p className="rc-moderation-description">{selectedReport.descricao}</p>
              <dl className="rc-moderation-metadata">
                <div><dt><i className="bi bi-geo-alt" /> Localização</dt><dd>{selectedReport.localizacao}</dd></div>
                <div><dt><i className="bi bi-person" /> Publicado por</dt><dd>{selectedReport.User?.username || 'Usuário não identificado'}</dd></div>
                <div><dt><i className="bi bi-calendar3" /> Enviado em</dt><dd>{new Date(selectedReport.createdAt).toLocaleString('pt-BR')}</dd></div>
              </dl>
            </div>
            <aside className="rc-moderation-detail-actions">
              <h3>{selectedReport.queue === 'approved' ? 'Atualizar encaminhamento' : selectedReport.queue === 'rejected' ? 'Revisar rejeição' : 'Decisão da moderação'}</h3>
              <p>{selectedReport.queue === 'approved' ? 'Defina o andamento e o serviço que ficará responsável pela denúncia.' : selectedReport.queue === 'rejected' ? 'Consulte o motivo informado ou reabra o registro para uma nova análise.' : 'Revise todos os dados antes de aprovar ou rejeitar esta publicação.'}</p>
              {selectedReport.queue === 'approved' ? <>
                <ResolutionTimeline status={resolutionDetails[selectedReport.id]?.resolucaoStatus || selectedReport.resolucaoStatus} />
                <label className="form-label fw-semibold mt-3">Andamento</label>
                <select className="form-select" disabled={!canUpdateResolution} value={resolutionDetails[selectedReport.id]?.resolucaoStatus || selectedReport.resolucaoStatus || 'aberta'} onChange={event => setResolutionDetails(current => ({ ...current, [selectedReport.id]: { ...current[selectedReport.id], resolucaoStatus: event.target.value } }))}><option value="aberta">Aberta</option><option value="em_andamento">Em andamento</option><option value="resolvida">Resolvida</option></select>
                <label className="form-label fw-semibold mt-3">Setor responsável</label>
                <select className="form-select" disabled={!canUpdateResolution} value={resolutionDetails[selectedReport.id]?.setorResponsavel || ''} onChange={event => setResolutionDetails(current => ({ ...current, [selectedReport.id]: { ...current[selectedReport.id], setorResponsavel: event.target.value } }))}><option value="">Selecione um setor</option>{SETORES.map(setor => <option value={setor} key={setor}>{setor}</option>)}</select>
                {canUpdateResolution && <button className="btn btn-primary w-100 mt-3" disabled={savingResolution === selectedReport.id || !hasResolutionChanges(selectedReport)} onClick={() => atualizarResolucao(selectedReport.id)}><i className="bi bi-check2-circle me-1" />{savingResolution === selectedReport.id ? 'Salvando...' : 'Salvar mudanças'}</button>}
                {canViewAudit && <button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={() => navigate(`/moderacao/denuncia/${selectedReport.id}/historico`)}><i className="bi bi-clock-history me-1" />Histórico de alterações</button>}
              </> : selectedReport.queue === 'rejected' ? <>
                <div className="rc-rejection-reason"><strong>Motivo da rejeição</strong><p>{selectedReport.motivoRejeicao || 'Nenhum motivo registrado.'}</p></div>
                {canReviewModeration && <button className="btn btn-outline-warning w-100 mt-3" onClick={() => reabrirModeracao(selectedReport.id)}><i className="bi bi-arrow-counterclockwise me-1" />Reabrir moderação</button>}
                {canViewAudit && <button className="btn btn-outline-secondary btn-sm w-100 mt-2" onClick={() => navigate(`/moderacao/denuncia/${selectedReport.id}/historico`)}><i className="bi bi-clock-history me-1" />Histórico de alterações</button>}
              </> : canReviewModeration ? <>
                <label className="form-label fw-semibold">Motivo da rejeição <span className="text-danger">(obrigatório para rejeitar)</span></label>
                <textarea className="form-control" rows="4" maxLength="1000" placeholder="Explique o que o cidadão pode corrigir..." value={motivos[selectedReport.id] || ''} onChange={event => setMotivos(current => ({ ...current, [selectedReport.id]: event.target.value }))} />
                <div className="d-grid gap-2 mt-3"><button className="btn btn-success" onClick={() => moderar(selectedReport.id, 'aprovada')}><i className="bi bi-check-circle me-1" />Aprovar denúncia</button><button className="btn btn-danger" disabled={!motivos[selectedReport.id]?.trim()} onClick={() => moderar(selectedReport.id, 'rejeitada')}><i className="bi bi-x-circle me-1" />Rejeitar denúncia</button></div>
              </> : <p className="rc-permission-note"><i className="bi bi-eye" /> Você possui acesso somente para consultar esta denúncia.</p>}
            </aside>
          </div>
        </section>
      </div>}
      <Footer />
    </div>
  );
}
