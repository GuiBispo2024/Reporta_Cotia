import { useEffect, useState, useContext } from "react";
import denunciaService from "../services/denunciaService";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/authContext";
import Footer from "../components/Footer";
import ResolutionTimeline from "../components/ResolutionTimeline";
import { friendlyError } from '../utils/errorMessage';

export default function Moderacao() {
  const { user } = useContext(AuthContext);
  const [denuncias, setDenuncias] = useState([]);
  const [aprovadas, setAprovadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [motivos, setMotivos] = useState({});

  const carregar = async () => {
    try {
      setLoading(true);
      const todas = await denunciaService.listarParaModeracao();
      setDenuncias(todas.filter(d => d.status === "pendente"));
      setAprovadas(todas.filter(d => d.status === "aprovada"));
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

  const atualizarResolucao = async (id, resolucaoStatus) => {
    try {
      await denunciaService.atualizarResolucao(
        id,
        resolucaoStatus
      );

      setAprovadas(prev =>
        prev.map(d =>
          d.id === id
            ? {
                ...d,
                resolucaoStatus
              }
            : d
        )
      );
    } catch (err) {
      alert(
        friendlyError(err, "Não foi possível atualizar o andamento. O status anterior foi mantido.")
      );
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
        </div>

        {loading && <div className="text-center"><div className="spinner-border text-primary" /></div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && !denuncias.length && <div className="rc-empty">Não há denúncias pendentes no momento.</div>}

        <div className="row g-4">
          {denuncias.map(d => (
            <div className="col-12 col-md-6 col-lg-4" key={d.id}>
              <article className="card rc-card h-100">
                {d.imageUrl && <img src={d.imageUrl} className="rc-card-image" alt={d.titulo} />}
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
                  <label className="form-label small fw-semibold mt-2">Motivo da rejeição <span className="text-muted">(opcional)</span></label>
                  <textarea className="form-control form-control-sm" rows="2" maxLength="1000" placeholder="Explique o que o cidadão pode corrigir..." value={motivos[d.id] || ''} onChange={e => setMotivos(prev => ({ ...prev, [d.id]: e.target.value }))} />
                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-success flex-fill" onClick={() => moderar(d.id, "aprovada")}>✅ Aprovar</button>
                    <button className="btn btn-danger flex-fill" onClick={() => moderar(d.id, "rejeitada")}>❌ Rejeitar</button>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>

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
                      d.resolucaoStatus || "aberta"
                    }
                    onChange={e =>
                      atualizarResolucao(
                        d.id,
                        e.target.value
                      )
                    }
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

                </div>

              </div>

            ))}

          </div>
        )}
      </section>
      </main>
      <Footer />
    </div>
  );
}
