import { useEffect, useState, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import denunciaService from "../services/denunciaService";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/authContext";
import Footer from "../components/Footer";
import ResolutionTimeline from "../components/ResolutionTimeline";
import { friendlyError } from '../utils/errorMessage';
import ImageCarousel from '../components/ImageCarousel';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [motivos, setMotivos] = useState({});
  const [pendingMeta, setPendingMeta] = useState({ page: 1, totalPages: 1 });
  const [approvedMeta, setApprovedMeta] = useState({ page: 1, totalPages: 1 });
  const [resolutionDetails, setResolutionDetails] = useState({});
  const [savingResolution, setSavingResolution] = useState(null);

  const hasResolutionChanges = report => {
    const draft = resolutionDetails[report.id] || {};
    return (draft.resolucaoStatus || 'aberta') !== (report.resolucaoStatus || 'aberta') ||
      (draft.setorResponsavel || '') !== (report.setorResponsavel || '');
  };

  const carregar = async (pendingPage = 1, approvedPage = 1) => {
    try {
      setLoading(true);
      const [pending, approved] = await Promise.all([
        denunciaService.listarParaModeracao({ status: 'pendente', page: pendingPage, limit: 12 }),
        denunciaService.listarParaModeracao({ status: 'aprovada', page: approvedPage, limit: 12 })
      ]);
      setDenuncias(pending.data || []);
      setAprovadas(approved.data || []);
      setResolutionDetails(current => Object.fromEntries((approved.data || []).map(report => [
        report.id,
        current[report.id] || {
          resolucaoStatus: report.resolucaoStatus || 'aberta',
          setorResponsavel: report.setorResponsavel || ''
        }
      ])));
      setPendingMeta({ page: pending.page || 1, totalPages: pending.totalPages || 1 });
      setApprovedMeta({ page: approved.page || 1, totalPages: approved.totalPages || 1 });
    } catch (error) { setError(friendlyError(error, "Não foi possível carregar o painel de moderação. Atualize a página para tentar novamente.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.adm) carregar(); }, [user]);

  const moderar = async (id, status) => {
    try {
      const response = await denunciaService.moderar(id, {
        status,
        motivoRejeicao: status === 'rejeitada' ? motivos[id] || '' : ''
      });

      setDenuncias(prev =>
        prev.filter(d => d.id !== id)
      );

      if (status === "aprovada") {
        setAprovadas(prev => [
          response.denuncia,
          ...prev
        ]);
      }
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
      await carregar(pendingMeta.page, approvedMeta.page);
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível reabrir a moderação.'));
    }
  };

  if (!user?.adm) return <div className="container py-5"><div className="alert alert-danger">Apenas administradores podem acessar esta página.</div></div>;

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <div className="text-center mb-4">
          <span className="rc-eyebrow">PAINEL ADMINISTRATIVO</span>
          <h2 className="fw-bold">Moderação</h2>
          <p className="text-muted">Aprove ou rejeite novos registros antes da publicação.</p>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/moderacao/redefinicoes-senha')}><i className="bi bi-key me-1" />Rastreabilidade de senhas</button>
        </div>

        {loading && <div className="text-center"><div className="spinner-border text-primary" /></div>}
        {error && <div className="alert alert-danger">{error}</div>}
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
                  {(d.tituloOriginal || d.descricaoOriginal) && <div className="rc-censorship-review">
                    <strong><i className="bi bi-eye" /> Revisão de conteúdo automático</strong>
                    {d.tituloOriginal && <div className="rc-censored-field"><small>Título original</small><p>{d.tituloOriginal}</p><div><button className="btn btn-sm btn-outline-danger" onClick={() => revisarCensura(d.id, 'titulo', true)}>Manter censura</button><button className="btn btn-sm btn-outline-success" onClick={() => revisarCensura(d.id, 'titulo', false)}>Retirar censura</button></div></div>}
                    {d.descricaoOriginal && <div className="rc-censored-field"><small>Descrição original</small><p>{d.descricaoOriginal}</p><div><button className="btn btn-sm btn-outline-danger" onClick={() => revisarCensura(d.id, 'descricao', true)}>Manter censura</button><button className="btn btn-sm btn-outline-success" onClick={() => revisarCensura(d.id, 'descricao', false)}>Retirar censura</button></div></div>}
                  </div>}
                  <p className="small"><strong>Local:</strong> {d.localizacao}</p>
                  <p className="small"><strong>Usuário:</strong> {d.User?.username || "Desconhecido"}</p>
                  <label className="form-label small fw-semibold mt-2">Motivo da rejeição <span className="text-danger">(obrigatório para rejeitar)</span></label>
                  <textarea className="form-control form-control-sm" rows="2" maxLength="1000" placeholder="Explique o que o cidadão pode corrigir..." value={motivos[d.id] || ''} onChange={e => setMotivos(prev => ({ ...prev, [d.id]: e.target.value }))} />
                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-success flex-fill" onClick={() => moderar(d.id, "aprovada")}>✅ Aprovar</button>
                    <button className="btn btn-danger flex-fill" disabled={!motivos[d.id]?.trim()} onClick={() => moderar(d.id, "rejeitada")}>❌ Rejeitar</button>
                  </div>
                  <button className="btn btn-outline-secondary btn-sm mt-3" onClick={() => navigate(`/moderacao/denuncia/${d.id}/historico`)}><i className="bi bi-clock-history me-1" />Histórico de alterações</button>
                </div>
              </article>
            </div>
          ))}
        </div>
        {pendingMeta.totalPages > 1 && <div className="d-flex justify-content-center gap-3 mt-3"><button className="btn btn-outline-primary" disabled={pendingMeta.page <= 1} onClick={() => carregar(pendingMeta.page - 1, approvedMeta.page)}>Anterior</button><span className="align-self-center">Página {pendingMeta.page} de {pendingMeta.totalPages}</span><button className="btn btn-outline-primary" disabled={pendingMeta.page >= pendingMeta.totalPages} onClick={() => carregar(pendingMeta.page + 1, approvedMeta.page)}>Próxima</button></div>}

      <section className="mt-5">

        <h4 className="fw-bold">
          Atualizar resolução dos problemas
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

                  <label
                    className="form-label mt-3 fw-semibold"
                  >
                    Andamento
                  </label>

                  <select
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
                  <select className="form-select" value={resolutionDetails[d.id]?.setorResponsavel || ''} onChange={event => setResolutionDetails(current => ({ ...current, [d.id]: { ...current[d.id], setorResponsavel: event.target.value } }))}>
                    <option value="">Selecione um setor</option>
                    {SETORES.map(setor => <option value={setor} key={setor}>{setor}</option>)}
                  </select>
                  <button className="btn btn-primary mt-3 me-2" disabled={savingResolution === d.id || !hasResolutionChanges(d)} onClick={() => atualizarResolucao(d.id)}>
                    <i className="bi bi-check2-circle me-1" />{savingResolution === d.id ? 'Salvando...' : 'Salvar mudanças'}
                  </button>
                  <button className="btn btn-outline-warning btn-sm mt-3" onClick={() => reabrirModeracao(d.id)}><i className="bi bi-arrow-counterclockwise me-1" />Reabrir moderação</button>
                  <button className="btn btn-outline-secondary btn-sm mt-3 ms-2" onClick={() => navigate(`/moderacao/denuncia/${d.id}/historico`)}><i className="bi bi-clock-history me-1" />Histórico de alterações</button>

                </div>

              </div>

            ))}

          </div>
        )}
        {approvedMeta.totalPages > 1 && <div className="d-flex justify-content-center gap-3 mt-3"><button className="btn btn-outline-primary" disabled={approvedMeta.page <= 1} onClick={() => carregar(pendingMeta.page, approvedMeta.page - 1)}>Anterior</button><span className="align-self-center">Página {approvedMeta.page} de {approvedMeta.totalPages}</span><button className="btn btn-outline-primary" disabled={approvedMeta.page >= approvedMeta.totalPages} onClick={() => carregar(pendingMeta.page, approvedMeta.page + 1)}>Próxima</button></div>}
      </section>
      </main>
      <Footer />
    </div>
  );
}
