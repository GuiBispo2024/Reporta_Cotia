const BoardRepository = require('../repositories/BoardRepository');
const AppError = require('../utils/AppError');
const { PERMISSIONS } = require('../constants/accessControl');
const { hasPermission } = require('../utils/authorization');
const { Op } = require('sequelize');

const COLUMNS = [
  { key: 'pendente', label: 'Em moderação', where: { status: 'pendente' } },
  { key: 'aberta', label: 'Abertas', where: { status: 'aprovada', resolucaoStatus: 'aberta' } },
  { key: 'em_andamento', label: 'Em andamento', where: { status: 'aprovada', resolucaoStatus: 'em_andamento' } },
  { key: 'resolvida', label: 'Resolvidas', where: { status: 'aprovada', resolucaoStatus: 'resolvida' } },
  { key: 'rejeitada', label: 'Rejeitadas', where: { status: 'rejeitada' } }
];

function positiveInteger(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) {
    throw new AppError('Informe uma página e um limite válidos.', 400, 'VALIDATION_ERROR');
  }
  return Number(value);
}

function textFilter(value) {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > 120) throw new AppError('Filtro inválido.', 400, 'VALIDATION_ERROR');
  return value.trim() || null;
}

function dateFilter(value) {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('Informe as datas no formato AAAA-MM-DD.', 400, 'VALIDATION_ERROR');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError('Informe um período com datas válidas.', 400, 'VALIDATION_ERROR');
  }
  return parsed;
}

function average(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10;
}

function serviceMetrics(records) {
  const moderationHours = [];
  const resolutionHours = [];
  for (const record of records) {
    const plain = record.get ? record.get({ plain: true }) : record;
    const history = (plain.DenunciaHistoricos || []).slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const moderation = history.find(item => item.tipo === 'moderacao' && ['aprovada', 'rejeitada'].includes(item.statusNovo));
    if (moderation) {
      const duration = (new Date(moderation.createdAt) - new Date(plain.createdAt)) / 3600000;
      if (Number.isFinite(duration) && duration >= 0) moderationHours.push(duration);
    }
    const approval = history.find(item => item.tipo === 'moderacao' && item.statusNovo === 'aprovada');
    const resolution = approval && history.find(item => item.tipo === 'resolucao' && item.statusNovo === 'resolvida' && new Date(item.createdAt) >= new Date(approval.createdAt));
    if (approval && resolution) {
      const duration = (new Date(resolution.createdAt) - new Date(approval.createdAt)) / 3600000;
      if (Number.isFinite(duration) && duration >= 0) resolutionHours.push(duration);
    }
  }
  return {
    averageModerationHours: average(moderationHours),
    averageResolutionHours: average(resolutionHours),
    moderationSampleSize: moderationHours.length,
    resolutionSampleSize: resolutionHours.length
  };
}

function monthlyTrend(records) {
  const totals = new Map();
  for (const record of records) {
    const plain = record.get ? record.get({ plain: true }) : record;
    const date = new Date(plain.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const period = date.toISOString().slice(0, 7);
    totals.set(period, (totals.get(period) || 0) + 1);
  }
  return [...totals.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-12)
    .map(([period, total]) => ({ period, total }));
}

function boardFilters(query = {}) {
  const categoria = textFilter(query.categoria);
  const setorResponsavel = textFilter(query.setorResponsavel);
  const dataInicio = dateFilter(query.dataInicio);
  const dataFim = dateFilter(query.dataFim);
  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new AppError('A data inicial não pode ser posterior à data final.', 400, 'VALIDATION_ERROR');
  }
  const createdAt = {};
  if (dataInicio) createdAt[Op.gte] = dataInicio;
  if (dataFim) {
    const exclusiveEnd = new Date(dataFim);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    createdAt[Op.lt] = exclusiveEnd;
  }
  return {
    where: {
      ...(categoria ? { categoria } : {}),
      ...(setorResponsavel ? { setorResponsavel } : {}),
      ...(dataInicio || dataFim ? { createdAt } : {})
    },
    filters: {
      categoria,
      setorResponsavel,
      dataInicio: query.dataInicio || null,
      dataFim: query.dataFim || null
    }
  };
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
  const quote = String.fromCharCode(34);
  return quote + text.split(quote).join(quote + quote) + quote;
}

function reportStatus(report) {
  if (report.status !== 'aprovada') return report.status === 'pendente' ? 'Em moderação' : 'Rejeitada';
  return { aberta: 'Aberta', em_andamento: 'Em andamento', resolvida: 'Resolvida' }[report.resolucaoStatus] || report.resolucaoStatus;
}

function exportCsv(records) {
  const rows = records.map(report => [
    report.id,
    report.titulo,
    report.categoria,
    reportStatus(report),
    report.setorResponsavel || 'Não informado',
    report.localizacao,
    report.createdAt ? new Date(report.createdAt).toISOString() : '',
    report.updatedAt ? new Date(report.updatedAt).toISOString() : ''
  ]);
  return '\uFEFF' + [
    ['ID', 'Título', 'Categoria', 'Situação', 'Setor responsável', 'Localização', 'Data de cadastro', 'Última atualização'],
    ...rows
  ].map(row => row.map(csvCell).join(',')).join('\r\n');
}

class BoardService {
  static async getBoard(user, query = {}, scopeType = 'mine') {
    if (!user?.id) throw new AppError('Entre na sua conta para consultar o painel.', 401, 'AUTH_REQUIRED');
    const analytical = scopeType === 'analytical';
    const publicView = scopeType === 'public';
    if (analytical && !hasPermission(user, PERMISSIONS.DASHBOARD_FULL_VIEW)) {
      throw new AppError('Sua conta não possui acesso ao painel analítico.', 403, 'FORBIDDEN');
    }
    if (publicView && !hasPermission(user, PERMISSIONS.DASHBOARD_PUBLIC_VIEW)) {
      throw new AppError('Sua conta não possui acesso aos indicadores da comunidade.', 403, 'FORBIDDEN');
    }
    const page = positiveInteger(query.page, 1, 1000000);
    const limit = positiveInteger(query.limit, 8, 50);
    const column = query.column;
    const availableColumns = publicView
      ? COLUMNS.filter(item => ['aberta', 'em_andamento', 'resolvida'].includes(item.key))
      : COLUMNS;
    if (column !== undefined && !availableColumns.some(item => item.key === column)) throw new AppError('Coluna inválida.', 400, 'VALIDATION_ERROR');
    const parsedFilters = boardFilters(query);
    // The authenticated account defines the personal scope; query parameters cannot replace it.
    const scope = analytical ? {} : publicView ? { status: 'aprovada' } : { userId: user.id };
    const where = {
      ...scope,
      ...parsedFilters.where
    };
    const includeBreakdown = analytical || publicView;
    const [statuses, categories, sectors, locations, map, metricRecords] = await Promise.all([
      BoardRepository.grouped(where, ['status', 'resolucaoStatus']),
      includeBreakdown ? BoardRepository.grouped(where, ['categoria']) : [],
      includeBreakdown ? BoardRepository.grouped(where, ['setorResponsavel']) : [],
      includeBreakdown ? BoardRepository.grouped(where, ['localizacao']) : [],
      includeBreakdown ? BoardRepository.mapPoints(where) : null,
      includeBreakdown ? BoardRepository.serviceMetricRecords(where) : []
    ]);
    const counts = Object.fromEntries(COLUMNS.map(item => [item.key, 0]));
    for (const row of statuses) {
      const key = row.status === 'aprovada' ? row.resolucaoStatus : row.status;
      if (key in counts) counts[key] += Number(row.total);
    }
    const columns = await Promise.all(availableColumns.filter(item => !column || item.key === column).map(async item => {
      const total = counts[item.key];
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.min(page, Math.max(totalPages, 1));
      return { key: item.key, label: item.label, total, page: currentPage, totalPages,
        reports: await BoardRepository.reports({ ...where, ...item.where }, currentPage, limit) };
    }));
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const approved = counts.aberta + counts.em_andamento + counts.resolvida;
    const breakdown = (rows, field) => rows.map(row => ({ label: row[field] || 'Não informado', total: Number(row.total) }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
    return {
      scope: scopeType,
      summary: { total, ...counts, resolutionRate: approved ? Math.round(counts.resolvida / approved * 100) : 0 },
      columns,
      ...(includeBreakdown ? { breakdown: {
        categories: breakdown(categories, 'categoria'),
        sectors: breakdown(sectors, 'setorResponsavel'),
        locations: breakdown(locations, 'localizacao')
      }, map, metrics: serviceMetrics(metricRecords), trend: monthlyTrend(metricRecords) } : {}),
      filters: parsedFilters.filters,
      limit
    };
  }

  static async exportAnalytics(user, query = {}) {
    if (!user?.id) throw new AppError('Entre na sua conta para exportar os indicadores.', 401, 'AUTH_REQUIRED');
    if (!hasPermission(user, PERMISSIONS.DASHBOARD_FULL_VIEW) || !hasPermission(user, PERMISSIONS.DASHBOARD_EXPORT)) {
      throw new AppError('Sua conta não possui permissão para exportar o painel analítico.', 403, 'FORBIDDEN');
    }
    const parsedFilters = boardFilters(query);
    const reports = await BoardRepository.exportReports(parsedFilters.where);
    return {
      content: exportCsv(reports),
      filename: `reporta-cotia-denuncias-${new Date().toISOString().slice(0, 10)}.csv`,
      total: reports.length
    };
  }
}

module.exports = BoardService;
