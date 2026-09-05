import { useCallback, useEffect, useState, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/authContext";
import denunciaService from "../services/denunciaService";
import Comentarios from "../components/Comentarios.jsx";
import Like from "../components/Likes.jsx";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import FilterAndSearch from "../components/FilterAndSearch.jsx";
import Compartilhar from "../components/Compartilhar.jsx";
import { friendlyError } from '../utils/errorMessage';
import ImageCarousel from '../components/ImageCarousel.jsx';

const RESOLUTION = {
  aberta: { label: 'Aberta', icon: 'bi-circle-fill', className: 'is-open' },
  em_andamento: { label: 'Em andamento', icon: 'bi-clock-fill', className: 'is-progress' },
  resolvida: { label: 'Resolvida', icon: 'bi-check-circle-fill', className: 'is-resolved' }
};

const Home = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [result, setResult] = useState({ data: [], totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filtersRef = useRef({});
  const requestIdRef = useRef(0);

  const load = useCallback(async (page = 1, customFilters = filtersRef.current) => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const response = await denunciaService.filtrar({
        ...customFilters,
        page,
        limit: 12
      });
      const payload = Array.isArray(response)
        ? { data: response, totalPages: 1, page }
        : response;
      if (requestId === requestIdRef.current) setResult(payload);
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setError(friendlyError(error, "Não foi possível carregar as denúncias. Atualize a página para tentar novamente."));
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, {});
    const refreshSharesOrder = () => {
      if (filtersRef.current.sort === 'shares') load(1, filtersRef.current);
    };
    window.addEventListener('reporta:shares-changed', refreshSharesOrder);
    return () => window.removeEventListener('reporta:shares-changed', refreshSharesOrder);
  }, [load]);

  const aplicarFiltros = (params) => {
    filtersRef.current = params;
    load(1, params);
  };

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <section className="rc-hero mb-4">
          <div>
            <span className="rc-eyebrow">COTIA • PARTICIPAÇÃO CIDADÃ</span>
            <h1>{isAuthenticated ? `Olá, ${user?.username}!` : "Ajude a melhorar Cotia."}</h1>
            <p>Registre problemas urbanos, acompanhe o andamento e ajude a prefeitura a identificar onde a cidade precisa de atenção.</p>
          </div>
          {isAuthenticated && (
            <button className="btn btn-light btn-lg fw-bold" onClick={() => navigate("/nova-denuncia")}>
              + Nova denúncia
            </button>
          )}
        </section>

        <FilterAndSearch onFilter={aplicarFiltros} />

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="mt-3">Carregando denúncias...</p></div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="fw-bold mb-0">Problemas reportados</h3>
              <span className="text-muted small">{result.total ?? result.data.length} registros</span>
            </div>

            {result.data.length === 0 ? (
              <div className="rc-empty">Nenhuma denúncia aprovada encontrada.</div>
            ) : (
              <div className="row g-4 align-items-start rc-reports-grid">
                {result.data.map((d) => (
                  <div key={d.id} className="col-12 col-md-6 col-lg-4 rc-report-column">
                    <article className="card rc-card">
                      <ImageCarousel images={d.imageUrls} fallback={d.imageUrl} alt={`Evidência: ${d.titulo}`} compact />
                      <div className="card-body">
                        <div className="rc-card-topline">
                          <span className="badge rc-category">{d.categoria || "Outros"}</span>
                          <span className={`rc-status-compact ${RESOLUTION[d.resolucaoStatus]?.className || 'is-open'}`}><i className={`bi ${RESOLUTION[d.resolucaoStatus]?.icon || 'bi-circle-fill'}`} />{RESOLUTION[d.resolucaoStatus]?.label || 'Aberta'}</span>
                        </div>
                        <h5 className="rc-card-title">{d.titulo}</h5>
                        <p className="rc-card-description">{d.descricao}</p>
                        <div className="rc-card-location"><i className="bi bi-geo-alt-fill" /><span>{d.localizacao}</span></div>
                        {d.setorResponsavel && <div className="rc-card-sector"><i className="bi bi-building" /><span><small>Setor responsável</small>{d.setorResponsavel}</span></div>}
                        <div className="rc-card-meta"><span><i className="bi bi-person-circle" /> {d.User?.username || "Usuário não identificado"}</span><time><i className="bi bi-calendar3" /> {new Date(d.createdAt).toLocaleDateString("pt-BR")}</time></div>
                        <button className="rc-details-button" onClick={() => navigate(`/denuncia/${d.id}`)}><span>Ver detalhes</span><i className="bi bi-arrow-right" /></button>
                      </div>
                      <div className="card-footer bg-white border-0 rc-card-footer">
                        <Like denunciaId={d.id} initialCount={d.likesCount} initialLiked={d.likedByMe} />
                        <Compartilhar denunciaId={d.id} titulo={d.titulo} initialCount={d.sharesCount} />
                        <Comentarios denunciaId={d.id} initialCount={d.commentsCount} preview />
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            )}

            {result.totalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center gap-3 my-4">
                <button className="btn btn-outline-primary" disabled={result.page <= 1} onClick={() => load(result.page - 1)}>Anterior</button>
                <span>Página {result.page} de {result.totalPages}</span>
                <button className="btn btn-outline-primary" disabled={result.page >= result.totalPages} onClick={() => load(result.page + 1)}>Próxima</button>
              </div>
            )}
          </>
        )}
      </main>

      {isAuthenticated && <button className="rc-fab" onClick={() => navigate("/nova-denuncia")} title="Nova denúncia">+</button>}
      <Footer />
    </div>
  );
};

export default Home;
