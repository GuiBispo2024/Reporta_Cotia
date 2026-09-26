const BoardRepository = require('../repositories/BoardRepository');
const AnalyticsService = require('./AnalyticsService');
const AppError = require('../utils/AppError');
const { PERMISSIONS } = require('../constants/accessControl');
const { hasPermission } = require('../utils/authorization');
const { Op } = require('sequelize');
const { sequelize } = require('../models/db/db');
const { neighborhood } = require('../analytics/quality');
const ExcelJS = require('exceljs');

const COLUMNS = [
  { key: 'pendente', label: 'Em moderação', where: { status: 'pendente' } },
  { key: 'aberta', label: 'Abertas', where: { status: 'aprovada', resolucaoStatus: 'aberta' } },
  { key: 'em_andamento', label: 'Em andamento', where: { status: 'aprovada', resolucaoStatus: 'em_andamento' } },
  { key: 'resolvida', label: 'Resolvidas', where: { status: 'aprovada', resolucaoStatus: 'resolvida' } },
  { key: 'rejeitada', label: 'Rejeitadas', where: { status: 'rejeitada' } }
];

const HEATMAP = Object.freeze({
  precision: 3,
  minReports: 3,
  limit: 1000
});
const MAP_POINTS_LIMIT = 500;

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

function boardFilters(query = {}, snapshotNeighborhood = true) {
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
  // The dropdown uses canonical neighborhood names from the last analytical load.
  // Resolve that cohort by report ID instead of comparing it with legacy free text.
  const normalizedNeighborhood = neighborhood(bairro);
  const neighborhoodWhere = bairro && snapshotNeighborhood ? {
    id: { [Op.in]: sequelize.literal(`(SELECT "denunciaId" FROM "AnalyticsFacts" WHERE "runId" = (SELECT "activeRunId" FROM "AnalyticsStates" WHERE "id" = 1) AND "bairro" ${normalizedNeighborhood === null ? 'IS NULL' : `= ${sequelize.escape(normalizedNeighborhood)}`})`) }
  } : bairro ? { bairro } : {};
  return {
    where: {
      ...(categoria ? { categoria } : {}),
      ...(setorResponsavel ? { setorResponsavel } : {}),
      ...neighborhoodWhere,
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
    const parsedFilters = boardFilters(query, analytical || publicView);
    // The authenticated account defines the personal scope; query parameters cannot replace it.
    const scope = analytical ? {} : publicView ? { status: 'aprovada' } : { userId: user.id };
    const where = {
      ...scope,
      ...parsedFilters.where
    };
    const includeBreakdown = analytical || publicView;
    const [statuses, indicators, moderationDetails] = await Promise.all([
      BoardRepository.grouped(where, ['status', 'resolucaoStatus']),
      includeBreakdown ? AnalyticsService.indicators(user, query, scopeType) : null,
      analytical ? BoardRepository.moderationIndicators(where) : null
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
    return {
      scope: scopeType,
      generatedAt: new Date().toISOString(),
      summary,
      columns,
      ...(indicators || {}),
      ...(analytical ? { moderation: {
        pending: counts.pendente,
        approved,
        rejected: counts.rejeitada,
        censoredReports: moderationDetails.censoredReports,
        censoredComments: moderationDetails.censoredComments,
        censoredTotal: moderationDetails.censoredReports + moderationDetails.censoredComments,
        rejectionReasons: moderationDetails.rejectionReasons
      } } : {}),
      filters: parsedFilters.filters,
      limit
    };
  }

  static async getHeatmap(user, query = {}, scopeType = 'public') {
    if (!user?.id) throw new AppError('Entre na sua conta para consultar o mapa de calor.', 401, 'AUTH_REQUIRED');
    const analytical = scopeType === 'analytical';
    const publicView = scopeType === 'public';
    if (!analytical && !publicView) throw new AppError('Escopo do mapa de calor inválido.', 400, 'VALIDATION_ERROR');
    if (analytical && !hasPermission(user, PERMISSIONS.DASHBOARD_FULL_VIEW)) {
      throw new AppError('Sua conta não possui acesso ao mapa de calor analítico.', 403, 'FORBIDDEN');
    }
    if (publicView && !hasPermission(user, PERMISSIONS.DASHBOARD_PUBLIC_VIEW)) {
      throw new AppError('Sua conta não possui acesso ao mapa de calor da comunidade.', 403, 'FORBIDDEN');
    }

    const parsedFilters = boardFilters(query);
    const where = {
      ...(publicView ? { status: 'aprovada' } : {}),
      ...parsedFilters.where
    };
    const aggregated = await BoardRepository.heatmapCells(where, {
      precision: HEATMAP.precision,
      minReports: HEATMAP.minReports,
      limit: HEATMAP.limit + 1
    });
    const truncated = aggregated.length > HEATMAP.limit;
    const cells = aggregated.slice(0, HEATMAP.limit);
    const totals = cells.map(cell => cell.total);

    return {
      scope: scopeType,
      generatedAt: new Date().toISOString(),
      cells,
      summary: {
        cells: cells.length,
        representedReports: totals.reduce((sum, total) => sum + total, 0),
        maxIntensity: totals.length ? Math.max(...totals) : 0,
        truncated
      },
      privacy: {
        coordinatePrecision: HEATMAP.precision,
        minimumReportsPerCell: HEATMAP.minReports
      },
      filters: parsedFilters.filters
    };
  }

  static async getMapPoints(user, query = {}, scopeType = 'public') {
    if (!user?.id) throw new AppError('Entre na sua conta para consultar as denúncias no mapa.', 401, 'AUTH_REQUIRED');
    const analytical = scopeType === 'analytical';
    const publicView = scopeType === 'public';
    if (!analytical && !publicView) throw new AppError('Escopo do mapa de denúncias inválido.', 400, 'VALIDATION_ERROR');
    if (analytical && !hasPermission(user, PERMISSIONS.DASHBOARD_FULL_VIEW)) {
      throw new AppError('Sua conta não possui acesso ao mapa analítico de denúncias.', 403, 'FORBIDDEN');
    }
    if (publicView && !hasPermission(user, PERMISSIONS.DASHBOARD_PUBLIC_VIEW)) {
      throw new AppError('Sua conta não possui acesso ao mapa de denúncias da comunidade.', 403, 'FORBIDDEN');
    }

    const parsedFilters = boardFilters(query);
    const where = {
      ...(publicView ? { status: 'aprovada' } : {}),
      ...parsedFilters.where
    };
    const map = await BoardRepository.mapPoints(where, MAP_POINTS_LIMIT);
    return {
      scope: scopeType,
      generatedAt: new Date().toISOString(),
      ...map,
      filters: parsedFilters.filters
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

  static async getExportHistory(user, query = {}) {
    if (!user?.id) throw new AppError('Entre na sua conta para consultar a auditoria.', 401, 'AUTH_REQUIRED');
    if (!hasPermission(user, PERMISSIONS.DASHBOARD_AUDIT_VIEW)) {
      throw new AppError('Sua conta não possui permissão para consultar a auditoria de exportações.', 403, 'FORBIDDEN');
    }
    const page = positiveInteger(query.page, 1, 1000000);
    const limit = positiveInteger(query.limit, 20, 50);
    const sort = query.sort || 'newest';
    if (!['newest', 'oldest'].includes(sort)) {
      throw new AppError('Informe uma ordenação válida para o histórico.', 400, 'VALIDATION_ERROR');
    }
    return BoardRepository.exportAuditHistory({ page, limit, sort });
  }
}

module.exports = BoardService;
