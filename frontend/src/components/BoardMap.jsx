import { Link } from 'react-router-dom';

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida',
  pendente: 'Em moderação',
  rejeitada: 'Rejeitada'
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

function paddedRange(values, minimumPadding) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.12, minimumPadding);
  return [minimum - padding, maximum + padding];
}

export default function BoardMap({ map }) {
  if (!map) return null;
  const points = normalizePoints(map.points);

  if (!points.length) {
    return <section className="rc-board-map rc-board-map-empty" aria-labelledby="board-map-title">
      <div><i className="bi bi-map" aria-hidden="true" /><h2 id="board-map-title">Distribuição geográfica</h2></div>
      <p>As denúncias deste recorte ainda não possuem coordenadas para exibição no mapa.</p>
    </section>;
  }

  const [minLatitude, maxLatitude] = paddedRange(points.map(point => point.latitude), 0.004);
  const [minLongitude, maxLongitude] = paddedRange(points.map(point => point.longitude), 0.004);
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${minLongitude},${minLatitude},${maxLongitude},${maxLatitude}`)}&layer=mapnik`;
  const position = point => ({
    left: `${((point.longitude - minLongitude) / (maxLongitude - minLongitude)) * 100}%`,
    top: `${((maxLatitude - point.latitude) / (maxLatitude - minLatitude)) * 100}%`
  });
  const statusKey = point => point.status === 'aprovada' ? point.resolucaoStatus : point.status;

  return <section className="rc-board-map" aria-labelledby="board-map-title">
    <header>
      <div><span><i className="bi bi-geo-alt-fill" aria-hidden="true" /></span><div><h2 id="board-map-title">Distribuição geográfica</h2><p>Visualize onde estão concentradas as denúncias deste recorte.</p></div></div>
      <strong>{points.length} {points.length === 1 ? 'ponto exibido' : 'pontos exibidos'}</strong>
    </header>
    <div className="rc-board-map-canvas">
      <iframe src={mapUrl} title="Mapa das denúncias do board" loading="lazy" referrerPolicy="no-referrer" tabIndex={-1} />
      <div className="rc-board-map-markers" aria-label="Denúncias localizadas no mapa">
        {points.map(point => {
          const key = statusKey(point);
          const label = `${point.titulo}, ${point.localizacao}. Situação: ${STATUS_LABELS[key] || key}`;
          const marker = <span className="rc-board-map-marker-dot"><i className="bi bi-megaphone-fill" aria-hidden="true" /></span>;
          return point.status === 'aprovada'
            ? <Link key={point.id} className={`rc-board-map-marker is-${key}`} style={position(point)} to={`/denuncia/${point.id}`} aria-label={`Abrir denúncia: ${label}`} title={label}>{marker}</Link>
            : <span key={point.id} className={`rc-board-map-marker is-${key}`} style={position(point)} aria-label={label} title={label} role="img">{marker}</span>;
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
