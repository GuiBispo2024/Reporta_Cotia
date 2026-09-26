const { CATEGORIAS } = require('../utils/validateDenuncia');

const ISSUE_LABELS = Object.freeze({
  missing_category: 'Categoria ausente', invalid_category: 'Categoria desconhecida',
  missing_neighborhood: 'Bairro ausente', incomplete_address: 'Endereço incompleto',
  invalid_created_at: 'Data de cadastro inválida ou futura', invalid_status: 'Status inconsistente',
  invalid_history: 'Datas do histórico inconsistentes',
  missing_moderation_history: 'Histórico de moderação ausente',
  missing_resolution_history: 'Histórico de resolução ausente'
});
const clean = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
function neighborhood(value) {
  const normalized = key(value).replace(/^jd\.?\s+/, 'jardim ').replace(/^vl\.?\s+/, 'vila ');
  if (!normalized || ['nao informado', 'nao informada'].includes(normalized)) return null;
  return normalized.split(' ').map((word, i) => i && ['de', 'da', 'do', 'das', 'dos', 'e'].includes(word)
    ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
const categories = new Map(CATEGORIAS.map(category => [key(category), category]));
const date = value => value == null || value === '' ? NaN : new Date(value).getTime();

function factFromReport(report, now) {
  const issues = new Set();
  const createdAt = date(report.createdAt);
  const validDate = Number.isFinite(createdAt) && createdAt <= now.getTime();
  if (!validDate) issues.add('invalid_created_at');
  const categoria = categories.get(key(report.categoria)) || null;
  if (!categoria) issues.add(clean(report.categoria) ? 'invalid_category' : 'missing_category');
  const bairro = neighborhood(report.bairro);
  if (!bairro) issues.add('missing_neighborhood');
  // The source is free text: this is a completeness check, not address verification.
  if (!bairro || clean(report.localizacao).split(',').filter(part => part.trim()).length < 2) issues.add('incomplete_address');
  const validStatus = ['pendente', 'aprovada', 'rejeitada'].includes(report.status)
    && ['aberta', 'em_andamento', 'resolvida'].includes(report.resolucaoStatus)
    && (report.status === 'aprovada' || report.resolucaoStatus === 'aberta');
  if (!validStatus) issues.add('invalid_status');
  const history = (report.DenunciaHistoricos || []).slice().sort((a, b) => date(a.createdAt) - date(b.createdAt) || a.id - b.id);
  const invalidHistory = history.some(event => !Number.isFinite(date(event.createdAt))
    || date(event.createdAt) < createdAt || date(event.createdAt) > now.getTime());
  let moderationHours = null;
  let resolutionHours = null;
  const decision = history.find(event => event.tipo === 'moderacao' && ['aprovada', 'rejeitada'].includes(event.statusNovo));
  const approval = history.find(event => event.tipo === 'moderacao' && event.statusNovo === 'aprovada');
  const resolution = history.find(event => event.tipo === 'resolucao' && event.statusNovo === 'resolvida');
  const invalidOrder = resolution && (!approval || date(resolution.createdAt) < date(approval.createdAt));
  if (invalidHistory || invalidOrder) issues.add('invalid_history');
  if (report.status !== 'pendente' && !decision) issues.add('missing_moderation_history');
  if (report.resolucaoStatus === 'resolvida' && (!approval || !resolution)) issues.add('missing_resolution_history');
  if (validDate && validStatus && !invalidHistory && !invalidOrder) {
    if (decision) moderationHours = (date(decision.createdAt) - createdAt) / 3600000;
    if (approval && resolution) resolutionHours = (date(resolution.createdAt) - date(approval.createdAt)) / 3600000;
  }
  return {
    denunciaId: report.id, day: validDate ? new Date(createdAt).toISOString().slice(0, 10) : null,
    categoria, bairro, setorResponsavel: clean(report.setorResponsavel) || null,
    status: validStatus ? report.status : null,
    resolucaoStatus: validStatus ? report.resolucaoStatus : null,
    eligible: validDate && validStatus, hasIssues: issues.size > 0, issues: [...issues], moderationHours, resolutionHours
  };
}
module.exports = { ISSUE_LABELS, neighborhood, factFromReport };
