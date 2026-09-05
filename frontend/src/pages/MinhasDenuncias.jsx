import { useCallback, useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import denunciasService from "../services/denunciaService";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ResolutionTimeline from "../components/ResolutionTimeline";
import ImageCarousel from '../components/ImageCarousel';
import { friendlyError } from '../utils/errorMessage';

const modBadge = (status) => ({
  aprovada: "bg-success", rejeitada: "bg-danger", pendente: "bg-warning text-dark"
}[status] || "bg-secondary");

export default function MinhasDenuncias() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [denuncias, setDenuncias] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setDenuncias(await denunciasService.buscarPorUsuario(user.id));
    } catch (err) {
      setError(err.response?.status === 404 ? null : friendlyError(err, "Não foi possível carregar suas denúncias. Atualize a página para tentar novamente."));
      setDenuncias([]);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (user) carregar(); }, [user, carregar]);

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir esta denúncia permanentemente? Comentários, curtidas e demais dados relacionados também serão removidos.")) return;
    try {
      await denunciasService.deletar(id);
      setDenuncias(prev => prev.filter(d => d.id !== id));
    } catch (err) { alert(friendlyError(err, "Não foi possível excluir a denúncia. Nenhuma informação foi removida.")); }
  };

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <div className="text-center mb-4">
          <span className="rc-eyebrow">ACOMPANHAMENTO</span>
          <h2 className="fw-bold">Minhas denúncias</h2>
          <p className="text-muted">Acompanhe a moderação e o progresso dos problemas que você registrou.</p>
        </div>

        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        : error ? <div className="alert alert-danger">{error}</div>
        : denuncias.length === 0 ? <div className="rc-empty">Você ainda não fez nenhuma denúncia.</div>
        : <div className="row g-4">
          {denuncias.map(d => (
            <div className="col-12 col-md-6" key={d.id}>
              <article className="card rc-card h-100">
                <ImageCarousel images={d.imageUrls} fallback={d.imageUrl} alt={d.titulo} compact />
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <h5 className="fw-bold">{d.titulo}</h5>
                    <span className={`badge ${modBadge(d.status)}`}>
                      {d.status === "pendente" ? "Em moderação" : d.status}
                    </span>
                  </div>
                  <p className="text-secondary">{d.descricao}</p>
                  <p><i className="bi bi-geo-alt" /> {d.localizacao}</p>

                  {d.status === "aprovada" && (
                    <>
                      <hr />
                      <div className="small text-muted mb-2">Progresso da solução</div>
                      <ResolutionTimeline status={d.resolucaoStatus} />
                      {d.setorResponsavel && <p className="small mt-2 mb-0"><i className="bi bi-building me-1" /><strong>Setor responsável:</strong> {d.setorResponsavel}</p>}
                    </>
                  )}

                  {d.status === "rejeitada" && (
                    <div className="alert alert-warning py-2 small"><strong>A denúncia foi rejeitada.</strong>{d.motivoRejeicao && <span className="d-block mt-1"><strong>Motivo informado:</strong> {d.motivoRejeicao}</span>}<span className="d-block mt-1">Você pode corrigir os dados e reenviar para moderação.</span></div>
                  )}
                </div>
                <div className="card-footer bg-white border-0 d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => navigate(`/denuncia/${d.id}`)}>Detalhes</button>
                  {d.status === "rejeitada" && <button className="btn btn-warning btn-sm" onClick={() => navigate(`/editar-denuncia/${d.id}`)}>Editar</button>}
                  {d.status !== "aprovada" && <button className="btn btn-outline-danger btn-sm" onClick={() => handleExcluir(d.id)}>Excluir</button>}
                </div>
              </article>
            </div>
          ))}
        </div>}
      </main>
      <Footer />
    </div>
  );
}
