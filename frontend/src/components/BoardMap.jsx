import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida',
  pendente: 'Em moderação',
  rejeitada: 'Rejeitada'
};

const STATUS_COLORS = {
  aberta: '#7c3aed',
  em_andamento: '#2269b1',
  resolvida: '#2f7d4f',
  pendente: '#9a7300',
  rejeitada: '#bc4555'
};

function normalizePoints(points = []) {
  const coordinate = value => value === null
    || value === undefined
    || (typeof value === 'string' && !value.trim())
    ? Number.NaN
    : Number(value);
  return points.map(point => ({
    ...point,
    latitude: coordinate(point.latitude),
    longitude: coordinate(point.longitude)
  })).filter(point => Number.isFinite(point.latitude)
    && Number.isFinite(point.longitude)
    && point.latitude >= -90 && point.latitude <= 90
    && point.longitude >= -180 && point.longitude <= 180);
}

const statusKey = point => point.status === 'aprovada' ? point.resolucaoStatus : point.status;
const pointLabel = point => `${point.titulo}, ${point.localizacao}. Situação: ${STATUS_LABELS[statusKey(point)] || statusKey(point)}`;

export default function BoardMap({ map }) {
  const mapContainerRef = useRef(null);
  const points = useMemo(() => normalizePoints(map?.points), [map?.points]);

  useEffect(() => {
    if (!mapContainerRef.current || !points.length) return undefined;
    const leafletMap = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      zoomControl: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(leafletMap);

    for (const point of points) {
      const key = statusKey(point);
      L.circleMarker([point.latitude, point.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: STATUS_COLORS[key] || '#285f4d',
        fillOpacity: 0.95
      }).addTo(leafletMap).bindTooltip(pointLabel(point), { direction: 'top' });
    }

    if (points.length === 1) {
      leafletMap.setView([points[0].latitude, points[0].longitude], 15);
    } else {
      leafletMap.fitBounds(
        L.latLngBounds(points.map(point => [point.latitude, point.longitude])),
        { padding: [24, 24], maxZoom: 15 }
      );
    }

    return () => leafletMap.remove();
  }, [points]);

  if (!map) return null;

  if (!points.length) {
    return <section className="rc-board-map rc-board-map-empty" aria-labelledby="board-map-title">
      <div><i className="bi bi-map" aria-hidden="true" /><h2 id="board-map-title">Distribuição geográfica</h2></div>
      <p>As denúncias deste recorte ainda não possuem coordenadas para exibição no mapa.</p>
    </section>;
  }

  return <section className="rc-board-map" aria-labelledby="board-map-title">
    <header>
      <div><span><i className="bi bi-geo-alt-fill" aria-hidden="true" /></span><div><h2 id="board-map-title">Distribuição geográfica</h2><p>Visualize onde estão concentradas as denúncias deste recorte.</p></div></div>
      <strong>{points.length} {points.length === 1 ? 'ponto exibido' : 'pontos exibidos'}</strong>
    </header>
    <div className="rc-board-map-canvas">
      <div ref={mapContainerRef} className="rc-board-map-leaflet" role="region" aria-label="Mapa interativo das denúncias" title="Mapa das denúncias do board" />
      <div className="visually-hidden" aria-label="Denúncias localizadas no mapa">
        {points.map(point => {
          const label = pointLabel(point);
          return point.status === 'aprovada'
            ? <Link key={point.id} to={`/denuncia/${point.id}`} aria-label={`Abrir denúncia: ${label}`}>{point.titulo}</Link>
            : <span key={point.id} aria-label={label} role="img">{point.titulo}</span>;
        })}
      </div>
    </div>
    <footer>
      <div className="rc-board-map-legend" aria-label="Legenda do mapa">
        {['aberta', 'em_andamento', 'resolvida'].map(key => <span key={key}><i className={`is-${key}`} />{STATUS_LABELS[key]}</span>)}
      </div>
      <small>{map.truncated ? `Exibindo os ${points.length} pontos mais recentes de ${map.total}. Refine os filtros para visualizar outros resultados.` : 'Os pontos acompanham os filtros aplicados ao board.'}</small>
    </footer>
  </section>;
}
