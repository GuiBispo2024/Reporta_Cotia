export default function ReopenReportButton({ report, onReopen, className = '' }) {
  const resolved = report.resolucaoStatus === 'resolvida';
  return <div>
    <button type="button" className={`btn btn-outline-warning ${className}`} disabled={resolved} onClick={() => onReopen(report.id)}>
      <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />Reabrir moderação
    </button>
    {resolved && <small className="d-block text-muted mt-1">Indisponível: esta denúncia já foi resolvida.</small>}
  </div>;
}
