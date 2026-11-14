// Public individual locations use a fixed 0.01 degree grid (about 1 km in Cotia).
// This is generalization, not anonymity; private originals are never overwritten.
function approximateCoordinates(latitude, longitude) {
  if ([latitude, longitude].some(value => !['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim()))) return { latitude: null, longitude: null };
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { latitude: null, longitude: null };
  return { latitude: Math.round(lat * 100) / 100, longitude: Math.round(lon * 100) / 100 };
}
function publicReport(record) {
  const value = record?.get ? record.get({ plain: true }) : { ...record };
  delete value.tituloOriginal;
  delete value.descricaoOriginal;
  delete value.motivoRejeicao;
  return { ...value, ...('latitude' in value || 'longitude' in value ? approximateCoordinates(value.latitude, value.longitude) : {}),
    localizacao: 'Cotia — localização aproximada', bairro: '', locationApproximate: true };
}
function publicResults(result) {
  if (Array.isArray(result)) return result.filter(item => item.status === 'aprovada').map(publicReport);
  return { ...result, data: result.data.filter(item => item.status === 'aprovada').map(publicReport) };
}
const publicMapTitle = value => (typeof value === 'string' ? value.replace(/\d+/g, '').trim() : '') || 'Ocorrência pública';
function publicBreakdown(value = {}) {
  const regions = new Map();
  for (const item of value.neighborhoods || []) {
    const label = /\d|\b(?:rua|avenida|casa|apto|apartamento|lote|bloco|latitude|longitude)\b/i.test(item.label)
      ? 'Região não divulgada' : item.label;
    regions.set(label, (regions.get(label) || 0) + item.total);
  }
  return { ...value, neighborhoods: [...regions].map(([label, total]) => ({ label, total })) };
}
module.exports = { approximateCoordinates, publicReport, publicResults, publicMapTitle, publicBreakdown };
