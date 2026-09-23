import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

if (typeof window !== 'undefined') window.L = L;
require('leaflet.heat');

const STATUS_LABELS = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida',
  pendente: 'Em moderação',
  rejeitada: 'Rejeitada'
};
const STATUS_COLORS = {
  aberta: '#2563eb',
  em_andamento: '#f59e0b',
  resolvida: '#16a34a',
  pendente: '#64748b',
  rejeitada: '#dc2626'
};
const coordinate = value => value === null
  || value === undefined
  || (typeof value === 'string' && !value.trim())
  ? Number.NaN
  : Number(value);

function normalizeCells(cells = []) {
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

function normalizeReports(points = []) {
  return points.map(point => ({
    ...point,
    latitude: coordinate(point.latitude),
    longitude: coordinate(point.longitude)
  })).filter(point => Number.isFinite(point.latitude)
    && Number.isFinite(point.longitude)
    && point.latitude >= -90 && point.latitude <= 90
    && point.longitude >= -180 && point.longitude <= 180);
}

function tooltipContent(label) {
  const content = document.createElement('span');
  content.textContent = label;
  return content;
}

function MapState({ type, message, onRetry }) {
  return <section className="rc-board-map rc-board-map-empty" aria-labelledby="board-map-title">
    <div><i className="bi bi-map" aria-hidden="true" /><h2 id="board-map-title">Mapa de calor das denúncias</h2></div>
    <p role={type === 'error' ? 'alert' : 'status'}>{message}</p>
    {type === 'error' && <button type="button" className="btn btn-outline-danger btn-sm mt-2" onClick={onRetry}>Tentar novamente</button>}
  </section>;
}

export default function BoardMap({
  heatmap,
  reportMap,
  loading = false,
  error = '',
  reportsLoading = false,
  reportsError = '',
  onRetry,
  onLoadReports,
  onSelectReport
}) {
  const mapContainerRef = useRef(null);
  const [viewMode, setViewMode] = useState('heat');
  const cells = useMemo(() => normalizeCells(heatmap?.cells), [heatmap?.cells]);
  const reports = useMemo(() => normalizeReports(reportMap?.points), [reportMap?.points]);
  const maxIntensity = Number(heatmap?.summary?.maxIntensity)
    || Math.max(0, ...cells.map(cell => cell.total));
  const visiblePoints = viewMode === 'reports' ? reports : cells;

  useEffect(() => {
    if (!mapContainerRef.current || !visiblePoints.length) return undefined;
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
    if (viewMode === 'heat') {
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
    } else if (viewMode === 'grouped') {
      for (const cell of cells) {
        const intensity = cell.total / (maxIntensity || 1);
        const label = `${cell.total} ${cell.total === 1 ? 'denúncia agrupada' : 'denúncias agrupadas'} nesta região aproximada`;
        L.circleMarker([cell.latitude, cell.longitude], {
          radius: 7 + Math.round(intensity * 11),
          color: '#ffffff',
          weight: 2,
          fillColor: intensity >= 0.75 ? '#dc2626' : intensity >= 0.5 ? '#f59e0b' : intensity >= 0.25 ? '#22c55e' : '#2563eb',
          fillOpacity: 0.85
        }).addTo(leafletMap).bindTooltip(tooltipContent(label), { direction: 'top' });
      }
    } else {
      for (const report of reports) {
        const status = report.status === 'aprovada' ? report.resolucaoStatus : report.status;
        const statusLabel = STATUS_LABELS[status] || status || 'Não informada';
        const label = `${report.titulo}. ${report.localizacao}. Situação: ${statusLabel}`;
        const marker = L.circleMarker([report.latitude, report.longitude], {
          radius: 9,
          color: '#ffffff',
          weight: 2,
          fillColor: STATUS_COLORS[status] || '#2563eb',
          fillOpacity: 0.95
        }).addTo(leafletMap).bindTooltip(tooltipContent(label), { direction: 'top' });
        marker.on('click', () => onSelectReport?.({ ...report, columnLabel: statusLabel }));
      }
    }

    if (visiblePoints.length === 1) {
      leafletMap.setView([visiblePoints[0].latitude, visiblePoints[0].longitude], 14);
    } else {
      leafletMap.fitBounds(
        L.latLngBounds(visiblePoints.map(point => [point.latitude, point.longitude])),
        { padding: [24, 24], maxZoom: 14 }
      );
    }

    const resizeMap = () => leafletMap.invalidateSize({ pan: false });
    window.addEventListener('resize', resizeMap);
    return () => {
      window.removeEventListener('resize', resizeMap);
      leafletMap.remove();
    };
  }, [cells, maxIntensity, onSelectReport, reports, viewMode, visiblePoints]);

  if (loading) return <MapState type="loading" message="Carregando concentrações geográficas..." />;
  if (error) return <MapState type="error" message={error} onRetry={onRetry} />;
  if (!heatmap) return null;

  const representedReports = Number(heatmap.summary?.representedReports) || 0;
  const isHeatmap = viewMode === 'heat';
  const isGrouped = viewMode === 'grouped';
  const isReports = viewMode === 'reports';
  const activeLoading = isReports && reportsLoading;
  const activeError = isReports ? reportsError : '';
  const activeEmpty = !activeLoading && !activeError && !visiblePoints.length;
  const displayedTotal = isReports ? (Number(reportMap?.total) || reports.length) : representedReports;
  const description = isHeatmap
    ? 'Identifique regiões com maior concentração sem expor endereços individuais.'
    : isGrouped
      ? 'Compare regiões por círculos dimensionados conforme a quantidade de denúncias.'
      : 'Selecione um marcador para abrir os detalhes da denúncia neste board.';
  const selectReports = () => {
    setViewMode('reports');
    if (!reportMap && !reportsLoading) onLoadReports?.();
  };
  const emptyMessage = isReports
    ? 'As denúncias deste recorte ainda não possuem coordenadas para exibição no mapa.'
    : `Nenhuma região possui o mínimo de ${heatmap.privacy?.minimumReportsPerCell || 3} denúncias para ser exibida neste recorte.`;

  return <section className="rc-board-map" aria-labelledby="board-map-title">
    <header>
      <div><span><i className={`bi ${isHeatmap ? 'bi-fire' : 'bi-geo-alt-fill'}`} aria-hidden="true" /></span><div><h2 id="board-map-title">Mapa das denúncias</h2><p>{description}</p></div></div>
      <strong>{displayedTotal} {displayedTotal === 1 ? 'denúncia representada' : 'denúncias representadas'}</strong>
    </header>
    <div className="rc-board-map-toolbar" role="group" aria-label="Tipo de visualização do mapa">
      <button type="button" className={`btn btn-sm ${isHeatmap ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={isHeatmap} onClick={() => setViewMode('heat')}><i className="bi bi-fire" aria-hidden="true" /> Mapa de calor</button>
      <button type="button" className={`btn btn-sm ${isGrouped ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={isGrouped} onClick={() => setViewMode('grouped')}><i className="bi bi-circle-fill" aria-hidden="true" /> Pontos agrupados</button>
      <button type="button" className={`btn btn-sm ${isReports ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={isReports} onClick={selectReports}><i className="bi bi-megaphone-fill" aria-hidden="true" /> Denúncias</button>
    </div>
    <p id="board-map-help" className="rc-board-map-help">Use os botões de zoom ou, com o mapa em foco, as teclas mais, menos e as setas.</p>
    <p className="visually-hidden" aria-live="polite">{activeLoading
      ? 'Carregando denúncias localizadas.'
      : `Visualização em ${isHeatmap ? 'mapa de calor' : isGrouped ? 'pontos agrupados' : 'denúncias individuais'} com ${visiblePoints.length} ${isReports ? (visiblePoints.length === 1 ? 'denúncia' : 'denúncias') : (visiblePoints.length === 1 ? 'região de concentração' : 'regiões de concentração')}.`}</p>
    <div className="rc-board-map-canvas">
      {activeLoading
        ? <div className="rc-board-map-inline-state" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Carregando denúncias no mapa...</div>
        : activeError
          ? <div className="rc-board-map-inline-state" role="alert"><p>{activeError}</p><button type="button" className="btn btn-outline-danger btn-sm" onClick={onLoadReports}>Tentar novamente</button></div>
          : activeEmpty
            ? <div className="rc-board-map-inline-state" role="status">{emptyMessage}</div>
            : <div ref={mapContainerRef} className="rc-board-map-leaflet" role="region" tabIndex={0} aria-label={isHeatmap ? 'Mapa de calor interativo das denúncias' : isGrouped ? 'Mapa de pontos agrupados das denúncias' : 'Mapa das denúncias individuais'} aria-describedby="board-map-help" title={isHeatmap ? 'Mapa de calor das denúncias' : isGrouped ? 'Pontos agrupados das denúncias' : 'Denúncias localizadas'} />}
    </div>
    {!activeLoading && !activeError && !activeEmpty && <footer>
      {isHeatmap
        ? <div className="rc-board-heat-legend" aria-label="Intensidade das concentrações"><span>Menor concentração</span><i aria-hidden="true" /><span>Maior concentração</span></div>
        : isGrouped
          ? <div className="rc-board-point-legend" aria-label="Legenda dos pontos agrupados"><i aria-hidden="true" /><span>Círculos maiores indicam mais denúncias na região</span></div>
          : <div className="rc-board-report-legend" aria-label="Situação das denúncias">{Object.entries(STATUS_LABELS).map(([key, label]) => <span key={key}><i className={`is-${key}`} aria-hidden="true" />{label}</span>)}</div>}
      <small>{isReports
        ? (reportMap?.truncated ? `Exibindo as ${reports.length} denúncias mais recentes de ${reportMap.total}. Refine os filtros para consultar outros pontos.` : 'Os marcadores acompanham os filtros aplicados. Selecione um ponto para abrir os detalhes.')
        : heatmap.summary?.truncated
          ? 'As regiões mais intensas estão visíveis. Refine os filtros para consultar outras concentrações.'
          : `As coordenadas estão agrupadas e regiões com menos de ${heatmap.privacy?.minimumReportsPerCell || 3} denúncias são ocultadas.`}</small>
    </footer>}
  </section>;
}
