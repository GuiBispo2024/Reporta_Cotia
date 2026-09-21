const BoardRepository = require('../repositories/BoardRepository');
const AppError = require('../utils/AppError');
const { PERMISSIONS } = require('../constants/accessControl');
const { hasPermission } = require('../utils/authorization');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

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

function categoryTrend(records) {
  const periodSet = new Set();
  const categories = new Map();
  for (const record of records) {
    const plain = record.get ? record.get({ plain: true }) : record;
    const date = new Date(plain.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const period = date.toISOString().slice(0, 7);
    const category = plain.categoria || 'Não informado';
    periodSet.add(period);
    if (!categories.has(category)) categories.set(category, new Map());
    const values = categories.get(category);
    values.set(period, (values.get(period) || 0) + 1);
  }
  const periods = [...periodSet].sort().slice(-12);
  const series = [...categories.entries()]
    .map(([label, values]) => {
      const monthlyValues = periods.map(period => values.get(period) || 0);
      return { label, total: monthlyValues.reduce((sum, value) => sum + value, 0), values: monthlyValues };
    })
    .filter(item => item.total)
    .sort((first, second) => second.total - first.total || first.label.localeCompare(second.label, 'pt-BR'));
  return { periods, series };
}

function statusCounts(rows) {
  const counts = Object.fromEntries(COLUMNS.map(item => [item.key, 0]));
  for (const row of rows) {
    const key = row.status === 'aprovada' ? row.resolucaoStatus : row.status;
    if (key in counts) counts[key] += Number(row.total);
  }
  return counts;
}

function summaryFromCounts(counts) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const approved = counts.aberta + counts.em_andamento + counts.resolvida;
  return {
    total,
    ...counts,
    approved,
    resolutionRate: approved ? Math.round(counts.resolvida / approved * 100) : 0
  };
}

function percentageChange(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round((current - previous) / previous * 100);
}

function comparisonPeriod(query, where) {
  if (!query.dataInicio || !query.dataFim) return null;
  const currentStart = new Date(`${query.dataInicio}T00:00:00.000Z`);
  const currentEndExclusive = new Date(`${query.dataFim}T00:00:00.000Z`);
  currentEndExclusive.setUTCDate(currentEndExclusive.getUTCDate() + 1);
  const duration = currentEndExclusive.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - duration);
  const previousEnd = new Date(currentStart);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const baseWhere = { ...where };
  delete baseWhere.createdAt;
  return {
    dataInicio: previousStart.toISOString().slice(0, 10),
    dataFim: previousEnd.toISOString().slice(0, 10),
    where: {
      ...baseWhere,
      createdAt: { [Op.gte]: previousStart, [Op.lt]: currentStart }
    }
  };
}

function boardFilters(query = {}) {
  const categoria = textFilter(query.categoria);
  const setorResponsavel = textFilter(query.setorResponsavel);
  const bairro = textFilter(query.bairro);
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
      ...(bairro ? { bairro } : {}),
      ...(dataInicio || dataFim ? { createdAt } : {})
    },
    filters: {
      categoria,
      setorResponsavel,
      bairro,
      dataInicio: query.dataInicio || null,
      dataFim: query.dataFim || null
    }
  };
}

function reportStatus(report) {
  if (report.status !== 'aprovada') return report.status === 'pendente' ? 'Em moderação' : 'Rejeitada';
  return { aberta: 'Aberta', em_andamento: 'Em andamento', resolvida: 'Resolvida' }[report.resolucaoStatus] || report.resolucaoStatus;
}

function excelDate(value) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(value));
  const part = type => parts.find(item => item.type === type)?.value || '';
  return new Date(Date.UTC(
    Number(part('year')),
    Number(part('month')) - 1,
    Number(part('day')),
    Number(part('hour')),
    Number(part('minute'))
  ));
}

async function exportWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Reporta Cotia';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Denúncias', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Título', key: 'titulo', width: 38 },
    { header: 'Categoria', key: 'categoria', width: 30 },
    { header: 'Situação', key: 'situacao', width: 20 },
    { header: 'Setor responsável', key: 'setor', width: 34 },
    { header: 'Localização', key: 'localizacao', width: 44 },
    { header: 'Bairro', key: 'bairro', width: 28 },
    { header: 'Data de cadastro', key: 'createdAt', width: 22 },
    { header: 'Última atualização', key: 'updatedAt', width: 22 }
  ];
  worksheet.autoFilter = 'A1:I1';
  worksheet.properties.defaultRowHeight = 22;

  const header = worksheet.getRow(1);
  header.height = 28;
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B4D' } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };

  for (const report of records) {
    const row = worksheet.addRow({
      id: report.id,
      titulo: report.titulo,
      categoria: report.categoria,
      situacao: reportStatus(report),
      setor: report.setorResponsavel || 'Não informado',
      localizacao: report.localizacao,
      bairro: report.bairro || 'Não informado',
      createdAt: excelDate(report.createdAt),
      updatedAt: excelDate(report.updatedAt)
    });
    row.height = 32;
    row.alignment = { vertical: 'middle', wrapText: true };
  }
  for (const columnNumber of [8, 9]) {
    worksheet.getColumn(columnNumber).numFmt = 'dd/mm/yyyy hh:mm';
    worksheet.getColumn(columnNumber).alignment = { vertical: 'middle', horizontal: 'center' };
  }
  worksheet.eachRow(row => {
    row.eachCell(cell => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFD9E2DE' } }
      };
    });
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
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
    const comparedPeriod = analytical ? comparisonPeriod(query, where) : null;
    const includeBreakdown = analytical || publicView;
    const [statuses, categories, sectors, neighborhoods, locations, map, metricRecords, moderationDetails, previousStatuses] = await Promise.all([
      BoardRepository.grouped(where, ['status', 'resolucaoStatus']),
      includeBreakdown ? BoardRepository.grouped(where, ['categoria']) : [],
      includeBreakdown ? BoardRepository.grouped(where, ['setorResponsavel']) : [],
      includeBreakdown ? BoardRepository.grouped(where, ['bairro']) : [],
      includeBreakdown ? BoardRepository.grouped(where, ['localizacao']) : [],
      includeBreakdown ? BoardRepository.mapPoints(where) : null,
      includeBreakdown ? BoardRepository.serviceMetricRecords(where) : [],
      analytical ? BoardRepository.moderationIndicators(where) : null,
      comparedPeriod ? BoardRepository.grouped(comparedPeriod.where, ['status', 'resolucaoStatus']) : []
    ]);
    const counts = statusCounts(statuses);
    const columns = await Promise.all(availableColumns.filter(item => !column || item.key === column).map(async item => {
      const total = counts[item.key];
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.min(page, Math.max(totalPages, 1));
      return { key: item.key, label: item.label, total, page: currentPage, totalPages,
        reports: await BoardRepository.reports({ ...where, ...item.where }, currentPage, limit) };
    }));
    const summary = summaryFromCounts(counts);
    const { approved } = summary;
    const previousSummary = comparedPeriod ? summaryFromCounts(statusCounts(previousStatuses)) : null;
    const breakdown = (rows, field) => rows.map(row => ({ label: row[field] || 'Não informado', total: Number(row.total) }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
    return {
      scope: scopeType,
      generatedAt: new Date().toISOString(),
      summary,
      columns,
      ...(includeBreakdown ? { breakdown: {
        categories: breakdown(categories, 'categoria'),
        sectors: breakdown(sectors, 'setorResponsavel'),
        neighborhoods: breakdown(neighborhoods, 'bairro'),
        locations: breakdown(locations, 'localizacao')
      }, map, metrics: serviceMetrics(metricRecords), trend: monthlyTrend(metricRecords) } : {}),
      ...(analytical ? { categoryTrend: categoryTrend(metricRecords), moderation: {
        pending: counts.pendente,
        approved,
        rejected: counts.rejeitada,
        censoredReports: moderationDetails.censoredReports,
        censoredComments: moderationDetails.censoredComments,
        censoredTotal: moderationDetails.censoredReports + moderationDetails.censoredComments,
        rejectionReasons: moderationDetails.rejectionReasons
      } } : {}),
      ...(comparedPeriod ? { comparison: {
        current: { dataInicio: query.dataInicio, dataFim: query.dataFim, ...summary },
        previous: { dataInicio: comparedPeriod.dataInicio, dataFim: comparedPeriod.dataFim, ...previousSummary },
        changes: {
          totalPercent: percentageChange(summary.total, previousSummary.total),
          approvedPercent: percentageChange(summary.approved, previousSummary.approved),
          resolvedPercent: percentageChange(summary.resolvida, previousSummary.resolvida),
          rejectedPercent: percentageChange(summary.rejeitada, previousSummary.rejeitada),
          resolutionRatePoints: summary.resolutionRate - previousSummary.resolutionRate
        }
      } } : {}),
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
    const content = await exportWorkbook(reports);
    await BoardRepository.recordExportAudit({
      userId: user.id,
      format: 'xlsx',
      filters: parsedFilters.filters,
      recordCount: reports.length
    });
    return {
      content,
      filename: `reporta-cotia-denuncias-${new Date().toISOString().slice(0, 10)}.xlsx`,
      total: reports.length
    };
  }
}

module.exports = BoardService;
