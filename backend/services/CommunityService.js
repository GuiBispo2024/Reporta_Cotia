const BoardRepository = require('../repositories/BoardRepository');
const { approximateCoordinates, publicMapTitle } = require('../utils/publicGeography');
const AppError = require('../utils/AppError');
const { CATEGORIAS } = require('../utils/validateDenuncia');
const { Op, Transaction } = require('sequelize');
const { sequelize } = require('../models/rel');
const LIMIT = 500;

function filters(query) {
  if (Object.keys(query).some(key => !['categoria', 'resolucaoStatus'].includes(key))) throw new AppError('Filtro comunitário inválido.', 400, 'VALIDATION_ERROR');
  for (const value of Object.values(query)) if (typeof value !== 'string' || value.length > 120) throw new AppError('Filtro inválido.', 400, 'VALIDATION_ERROR');
  const categoria = query.categoria?.trim() || null;
  const resolucaoStatus = query.resolucaoStatus || null;
  if (resolucaoStatus && !['aberta', 'em_andamento', 'resolvida'].includes(resolucaoStatus)) throw new AppError('Situação inválida.', 400, 'VALIDATION_ERROR');
  return { categoria, resolucaoStatus };
}
class CommunityService {
  static async indicators(where = {}, transaction = null) {
    const rows = await BoardRepository.grouped({ ...where, status: 'aprovada' }, ['resolucaoStatus', 'categoria'], transaction);
    const summary = { total: 0, aberta: 0, em_andamento: 0, resolvida: 0, approved: 0, pendente: 0, rejeitada: 0, resolutionRate: 0 };
    const categories = new Map();
    for (const row of rows) {
      const total = Number(row.total);
      summary.total += total;
      if (['aberta', 'em_andamento', 'resolvida'].includes(row.resolucaoStatus)) summary[row.resolucaoStatus] += total;
      const label = CATEGORIAS.includes(row.categoria) ? row.categoria : 'Outros';
      categories.set(label, (categories.get(label) || 0) + total);
    }
    summary.approved = summary.total;
    summary.resolutionRate = summary.total ? Math.round(summary.resolvida / summary.total * 100) : 0;
    return { summary, categories: [...categories].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)) };
  }
  static async get(query = {}) {
    const selected = filters(query);
    const where = { status: 'aprovada', ...(selected.categoria ? { categoria: selected.categoria } : {}), ...(selected.resolucaoStatus ? { resolucaoStatus: selected.resolucaoStatus } : {}) };
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
      const [indicators, map] = await Promise.all([this.indicators(where, transaction), BoardRepository.mapPoints({ ...where,
        ...(!selected.resolucaoStatus ? { resolucaoStatus: { [Op.in]: ['aberta', 'em_andamento', 'resolvida'] } } : {}) }, LIMIT, transaction)]);
      if (map.points.some(point => point.status !== 'aprovada')) throw new AppError('Projeção pública indisponível.', 503, 'INVALID_PUBLIC_PROJECTION');
      return { scope: 'community', generatedAt: new Date().toISOString(), source: 'live',
        summary: { total: indicators.summary.total, em_andamento: indicators.summary.em_andamento, resolvida: indicators.summary.resolvida },
        categories: indicators.categories,
        points: map.points.map(point => ({ id: point.id, titulo: publicMapTitle(point.titulo),
          categoria: CATEGORIAS.includes(point.categoria) ? point.categoria : 'Outros', status: 'aprovada', resolucaoStatus: point.resolucaoStatus,
          ...approximateCoordinates(point.latitude, point.longitude) })),
        total: map.total, limit: map.limit, truncated: map.truncated, filters: selected,
        privacy: { coordinatePrecision: 2, approximate: true, addressIncluded: false } };
    });
  }
}
module.exports = CommunityService;
