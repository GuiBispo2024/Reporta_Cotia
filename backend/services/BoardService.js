const BoardRepository = require('../repositories/BoardRepository');
const AppError = require('../utils/AppError');
const { PERMISSIONS } = require('../constants/accessControl');
const { hasPermission } = require('../utils/authorization');

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
    const categoria = textFilter(query.categoria);
    const setorResponsavel = textFilter(query.setorResponsavel);
    // The authenticated account defines the personal scope; query parameters cannot replace it.
    const scope = analytical ? {} : publicView ? { status: 'aprovada' } : { userId: user.id };
    const where = { ...scope, ...(categoria ? { categoria } : {}), ...(setorResponsavel ? { setorResponsavel } : {}) };
    const includeBreakdown = analytical || publicView;
    const [statuses, categories, sectors, locations] = await Promise.all([
      BoardRepository.grouped(where, ['status', 'resolucaoStatus']),
      includeBreakdown ? BoardRepository.grouped(where, ['categoria']) : [],
      includeBreakdown ? BoardRepository.grouped(where, ['setorResponsavel']) : [],
      includeBreakdown ? BoardRepository.grouped(where, ['localizacao']) : []
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
      } } : {}),
      filters: { categoria, setorResponsavel },
      limit
    };
  }
}

module.exports = BoardService;
