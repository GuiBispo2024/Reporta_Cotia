import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import denunciaService from "../services/denunciaService";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ResolutionTimeline from "../components/ResolutionTimeline";
import { friendlyError } from '../utils/errorMessage';
import { formatAddress } from '../utils/formatAddress';

export default function DetalheDenuncia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [denuncia, setDenuncia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");

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
      .then(setDenuncia)
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
          <button className="btn btn-link px-0 mb-3" onClick={() => navigate(-1)}>← Voltar</button>
          {denuncia.imageUrl && <img src={denuncia.imageUrl} className="rc-detail-image" alt={`Evidência de ${denuncia.titulo}`} />}
          <div className="d-flex flex-wrap justify-content-between gap-2 mt-4">
            <span className="badge rc-category">{denuncia.categoria || "Outros"}</span>
            <span className={`badge ${denuncia.status === "aprovada" ? "bg-success" : denuncia.status === "rejeitada" ? "bg-danger" : "bg-warning text-dark"}`}>
              Moderação: {denuncia.status}
            </span>
          </div>
          <h1 className="fw-bold mt-3">{denuncia.titulo}</h1>
          <p className="lead text-secondary">{denuncia.descricao}</p>
          <div className="rc-detail-location"><span><i className="bi bi-geo-alt-fill" /></span><div><small>Localização da denúncia</small><strong>{resolvedAddress || denuncia.localizacao || 'Endereço não informado'}</strong></div></div>

          {denuncia.status === "aprovada" && (
            <section className="rc-progress mt-4">
              <h5 className="fw-bold">Acompanhamento da solução</h5>
              <ResolutionTimeline status={denuncia.resolucaoStatus} />
              {denuncia.resolucaoAtualizadaEm && (
                <small className="text-muted">Última atualização: {new Date(denuncia.resolucaoAtualizadaEm).toLocaleString("pt-BR")}</small>
              )}
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
        </article>}
      </main>
      <Footer />
    </div>
  );
}
