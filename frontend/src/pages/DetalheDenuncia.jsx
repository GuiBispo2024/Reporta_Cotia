import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import denunciaService from "../services/denunciaService";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ResolutionTimeline from "../components/ResolutionTimeline";
import { friendlyError } from '../utils/errorMessage';
import { formatAddress } from '../utils/formatAddress';
import Like from '../components/Likes';
import Compartilhar from '../components/Compartilhar';
import Comentarios from '../components/Comentarios';
import ImageCarousel from '../components/ImageCarousel';

export default function DetalheDenuncia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [denuncia, setDenuncia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [history, setHistory] = useState([]);

  const mapUrl = denuncia?.latitude && denuncia?.longitude
    ? (() => {
        const lat = Number(denuncia.latitude);
        const lon = Number(denuncia.longitude);
        const offset = 0.004;
        const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lon}`;
      })()
    : null;

  useEffect(() => {
    denunciaService.buscarPorId(id)
      .then(report => {
        setDenuncia(report);
        return denunciaService.buscarHistorico(id).then(setHistory).catch(() => setHistory([]));
      })
      .catch(err => setError(friendlyError(err, "Não foi possível abrir esta denúncia. Ela pode ter sido removida ou estar temporariamente indisponível.")))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!denuncia) return;
    const original = denuncia.localizacao?.trim();
    const genericAddress = !original || /^(localização atual|seu local)$/i.test(original);

    if (!genericAddress || !denuncia.latitude || !denuncia.longitude) {
      setResolvedAddress(original || 'Endereço não informado');
      return;
    }

    let active = true;
    const latitude = Number(denuncia.latitude);
    const longitude = Number(denuncia.longitude);
    setResolvedAddress(`Latitude ${latitude.toFixed(7)}, Longitude ${longitude.toFixed(7)}`);

    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
      headers: { 'Accept-Language': 'pt-BR' }
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (active && data) setResolvedAddress(current => formatAddress(data, current));
      })
      .catch(() => {});

    return () => { active = false; };
  }, [denuncia]);

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        : error ? <div className="alert alert-danger">{error}</div>
        : <article className="rc-detail mx-auto">
          <button className="btn btn-link px-0 mb-3" onClick={() => navigate('/', { replace: true })}>← Voltar para a página inicial</button>
          <ImageCarousel images={denuncia.imageUrls} fallback={denuncia.imageUrl} alt={`Evidência de ${denuncia.titulo}`} />
          <div className="d-flex flex-wrap justify-content-between gap-2 mt-4">
            <span className="badge rc-category">{denuncia.categoria || "Outros"}</span>
            <span className={`badge ${denuncia.status === "aprovada" ? "bg-success" : denuncia.status === "rejeitada" ? "bg-danger" : "bg-warning text-dark"}`}>
              Moderação: {denuncia.status}
            </span>
          </div>
          <h1 className="fw-bold mt-3">{denuncia.titulo}</h1>
          <p className="lead text-secondary">{denuncia.descricao}</p>
          <div className="rc-detail-location"><span><i className="bi bi-geo-alt-fill" /></span><div><small>Localização da denúncia</small><strong>{resolvedAddress || denuncia.localizacao || 'Endereço não informado'}</strong></div></div>

          <section className="rc-detail-engagement mt-4" aria-labelledby="detail-engagement-title">
            <div>
              <h2 id="detail-engagement-title">Atividade da denúncia</h2>
              <p>Veja todas as pessoas que apoiaram ou compartilharam esta publicação.</p>
            </div>
            <nav aria-label="Históricos da denúncia">
              <Link to={`/denuncia/${id}/curtidas`}><i className="bi bi-hand-thumbs-up-fill" /><span><strong>Histórico de curtidas</strong><small>Ver todas as curtidas</small></span><i className="bi bi-chevron-right" /></Link>
              <Link to={`/denuncia/${id}/compartilhamentos`}><i className="bi bi-share-fill" /><span><strong>Histórico de compartilhamentos</strong><small>Ver todos os compartilhamentos</small></span><i className="bi bi-chevron-right" /></Link>
            </nav>
            {denuncia.status === 'aprovada' && <div className="rc-detail-social-actions"><Like denunciaId={denuncia.id} initialCount={denuncia.likesCount} initialLiked={denuncia.likedByMe} /><Compartilhar denunciaId={denuncia.id} titulo={denuncia.titulo} initialCount={denuncia.sharesCount} /></div>}
          </section>

          {denuncia.status === "aprovada" && (
            <section className="rc-progress mt-4">
              <h5 className="fw-bold">Acompanhamento da solução</h5>
              <ResolutionTimeline status={denuncia.resolucaoStatus} />
              {denuncia.setorResponsavel && <div className="rc-responsible-sector"><i className="bi bi-building" /><div><small>Setor responsável</small><strong>{denuncia.setorResponsavel}</strong></div></div>}
              {denuncia.resolucaoAtualizadaEm && (
                <small className="text-muted">Última atualização: {new Date(denuncia.resolucaoAtualizadaEm).toLocaleString("pt-BR")}</small>
              )}
              {history.filter(item => item.tipo === 'resolucao').length > 0 && <div className="rc-resolution-history">{history.filter(item => item.tipo === 'resolucao').map(item => <article key={item.id}><span className="badge rc-category">{item.statusNovo?.replace('_', ' ')}</span><div><strong>{item.responsavel || 'Setor ainda não definido'}</strong><time>{new Date(item.createdAt).toLocaleString('pt-BR')}</time></div></article>)}</div>}
            </section>
          )}

          {mapUrl ? (
            <section className="rc-map-section mt-4">
              <div className="rc-map-header"><div><h2><i className="bi bi-map me-2" />Local do problema</h2><p>Visualize a localização sem sair do Reporta Cotia.</p></div><span className="rc-map-coordinates">{Number(denuncia.latitude).toFixed(5)}, {Number(denuncia.longitude).toFixed(5)}</span></div>
              <iframe className="rc-map-frame" src={mapUrl} title={`Mapa da localização de ${denuncia.titulo}`} loading="lazy" referrerPolicy="no-referrer" />
              <div className="rc-map-caption"><i className="bi bi-geo-alt-fill" /><span>{resolvedAddress || denuncia.localizacao}</span><small>Mapa fornecido pelo OpenStreetMap</small></div>
            </section>
          ) : (
            <div className="rc-map-unavailable mt-4"><i className="bi bi-map" /><div><strong>Mapa indisponível</strong><span>Esta denúncia não possui coordenadas geográficas.</span></div></div>
          )}

          {denuncia.status === 'aprovada' && (
            <section className="rc-detail-comments mt-4">
              <h2>Comentários</h2>
              <p>Acompanhe e participe da conversa sobre esta denúncia.</p>
              <Comentarios denunciaId={denuncia.id} initialCount={denuncia.commentsCount} initiallyOpen />
            </section>
          )}
        </article>}
      </main>
      <Footer />
    </div>
  );
}
