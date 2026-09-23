import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') window.L = L;
require('leaflet.heat');

function normalizeCells(cells = []) {
  const coordinate = value => value === null
    || value === undefined
    || (typeof value === 'string' && !value.trim())
    ? Number.NaN
    : Number(value);
  return cells.map(cell => ({
    latitude: coordinate(cell.latitude),
    longitude: coordinate(cell.longitude),
    total: Number(cell.total)
  })).filter(cell => Number.isFinite(cell.latitude)
    && Number.isFinite(cell.longitude)
    && cell.latitude >= -90 && cell.latitude <= 90
    && cell.longitude >= -180 && cell.longitude <= 180
    && Number.isFinite(cell.total) && cell.total > 0);
}

function MapState({ type, message, onRetry }) {
  return <section className="rc-board-map rc-board-map-empty" aria-labelledby="board-map-title">
    <div><i className="bi bi-map" aria-hidden="true" /><h2 id="board-map-title">Mapa de calor das denúncias</h2></div>
    <p role={type === 'error' ? 'alert' : 'status'}>{message}</p>
    {type === 'error' && <button type="button" className="btn btn-outline-danger btn-sm mt-2" onClick={onRetry}>Tentar novamente</button>}
  </section>;
}

export default function BoardMap({ heatmap, loading = false, error = '', onRetry }) {
  const mapContainerRef = useRef(null);
  const cells = useMemo(() => normalizeCells(heatmap?.cells), [heatmap?.cells]);
  const maxIntensity = Number(heatmap?.summary?.maxIntensity)
    || Math.max(0, ...cells.map(cell => cell.total));

  useEffect(() => {
    if (!mapContainerRef.current || !cells.length) return undefined;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const leafletMap = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      keyboard: true,
      zoomAnimation: !reduceMotion,
      fadeAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion
    });
    L.control.zoom({
      position: 'topleft',
      zoomInTitle: 'Aproximar',
      zoomOutTitle: 'Afastar'
    }).addTo(leafletMap);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(leafletMap);
    L.heatLayer(
      cells.map(cell => [cell.latitude, cell.longitude, cell.total]),
      {
        radius: 32,
        blur: 24,
        minOpacity: 0.35,
        max: maxIntensity || 1,
        maxZoom: 17,
        gradient: { 0.25: '#2563eb', 0.5: '#22c55e', 0.75: '#facc15', 1: '#dc2626' }
      }
    ).addTo(leafletMap);

    if (cells.length === 1) {
      leafletMap.setView([cells[0].latitude, cells[0].longitude], 14);
    } else {
      leafletMap.fitBounds(
        L.latLngBounds(cells.map(cell => [cell.latitude, cell.longitude])),
        { padding: [24, 24], maxZoom: 14 }
      );
    }

    const resizeMap = () => leafletMap.invalidateSize({ pan: false });
    window.addEventListener('resize', resizeMap);
    return () => {
      window.removeEventListener('resize', resizeMap);
      leafletMap.remove();
    };
  }, [cells, maxIntensity]);

  if (loading) return <MapState type="loading" message="Carregando concentrações geográficas..." />;
  if (error) return <MapState type="error" message={error} onRetry={onRetry} />;
  if (!heatmap) return null;
  if (!cells.length) {
    return <MapState
      type="empty"
      message={`Nenhuma região possui o mínimo de ${heatmap.privacy?.minimumReportsPerCell || 3} denúncias para ser exibida neste recorte.`}
    />;
  }

  const representedReports = Number(heatmap.summary?.representedReports) || 0;
  return <section className="rc-board-map" aria-labelledby="board-map-title">
    <header>
      <div><span><i className="bi bi-fire" aria-hidden="true" /></span><div><h2 id="board-map-title">Mapa de calor das denúncias</h2><p>Identifique regiões com maior concentração sem expor endereços individuais.</p></div></div>
      <strong>{representedReports} {representedReports === 1 ? 'denúncia representada' : 'denúncias representadas'}</strong>
    </header>
    <p id="board-map-help" className="rc-board-map-help">Use os botões de zoom ou, com o mapa em foco, as teclas mais, menos e as setas.</p>
    <p className="visually-hidden" aria-live="polite">O mapa apresenta {cells.length} {cells.length === 1 ? 'região de concentração' : 'regiões de concentração'}.</p>
    <div className="rc-board-map-canvas">
      <div ref={mapContainerRef} className="rc-board-map-leaflet" role="region" tabIndex={0} aria-label="Mapa de calor interativo das denúncias" aria-describedby="board-map-help" title="Mapa de calor das denúncias" />
    </div>
    <footer>
      <div className="rc-board-heat-legend" aria-label="Intensidade das concentrações">
        <span>Menor concentração</span><i aria-hidden="true" /><span>Maior concentração</span>
      </div>
      <small>{heatmap.summary?.truncated
        ? 'As regiões mais intensas estão visíveis. Refine os filtros para consultar outras concentrações.'
        : `As coordenadas estão agrupadas e regiões com menos de ${heatmap.privacy?.minimumReportsPerCell || 3} denúncias são ocultadas.`}</small>
    </footer>
  </section>;
}
