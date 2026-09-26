const { Op, Transaction } = require('sequelize');
const { sequelize, AnalyticsStates, AnalyticsRuns, AnalyticsAggregates, AnalyticsFacts } = require('../models/rel');
const AppError = require('../utils/AppError');
const { ISSUE_LABELS, neighborhood } = require('../analytics/quality');
const { hasPermission } = require('../utils/authorization');
const { PERMISSIONS } = require('../constants/accessControl');

function filters(query) {
  const result = {};
  for (const name of ['categoria', 'bairro', 'setorResponsavel', 'dataInicio', 'dataFim']) {
    const value = query[name];
    if (value !== undefined && (typeof value !== 'string' || value.length > 120)) throw new AppError('Filtro inválido.', 400, 'VALIDATION_ERROR');
    result[name] = value?.trim() || null;
  }
  for (const name of ['dataInicio', 'dataFim']) {
    const value = result[name];
    if (!value) continue;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new AppError('Informe as datas no formato AAAA-MM-DD com valores válidos.', 400, 'VALIDATION_ERROR');
    }
  }
  if (result.dataInicio && result.dataFim && result.dataInicio > result.dataFim) throw new AppError('A data inicial não pode ser posterior à data final.', 400, 'VALIDATION_ERROR');
  return result;
}
function whereFor(parsed, scope) {
  return {
    ...(scope === 'public' ? { status: 'aprovada' } : {}),
    ...(parsed.categoria ? { categoria: parsed.categoria } : {}),
    ...(parsed.bairro ? { bairro: neighborhood(parsed.bairro) } : {}),
    ...(parsed.setorResponsavel ? { setorResponsavel: parsed.setorResponsavel } : {}),
    ...(parsed.dataInicio || parsed.dataFim ? { day: {
      ...(parsed.dataInicio ? { [Op.gte]: parsed.dataInicio } : {}),
      ...(parsed.dataFim ? { [Op.lte]: parsed.dataFim } : {})
    } } : {})
  };
}
function authorize(user, scope) {
  if (!user?.id) throw new AppError('Entre na sua conta para consultar os indicadores.', 401, 'AUTH_REQUIRED');
  if (!['public', 'analytical'].includes(scope)) throw new AppError('Escopo inválido.', 400, 'VALIDATION_ERROR');
  const permission = scope === 'public' ? PERMISSIONS.DASHBOARD_PUBLIC_VIEW : PERMISSIONS.DASHBOARD_FULL_VIEW;
  if (!hasPermission(user, permission)) throw new AppError('Sua conta não possui acesso a esses indicadores.', 403, 'FORBIDDEN');
}
const round = value => Math.round(value * 10) / 10;
const change = (value, previous) => previous ? Math.round((value - previous) / previous * 100) : value ? null : 0;

function summarize(rows, analytical) {
  const summary = { total: 0, pendente: 0, aberta: 0, em_andamento: 0, resolvida: 0, rejeitada: 0, approved: 0, resolutionRate: 0 };
  const maps = { categories: new Map(), neighborhoods: new Map(), sectors: new Map(), months: new Map() };
  const categoryMonths = new Map();
  const quality = { sourceCount: 0, validCount: 0, excludedCount: 0, issueCount: 0, issues: {} };
  let moderationSum = 0, moderationSampleSize = 0, resolutionSum = 0, resolutionSampleSize = 0;
  const add = (map, label, total) => { if (label && total) map.set(label, (map.get(label) || 0) + total); };
  for (const row of rows) {
    const total = Number(row.total);
    quality.sourceCount += row.sourceCount;
    quality.validCount += total;
    quality.issueCount += row.issueCount;
    for (const [code, count] of Object.entries(row.issues)) quality.issues[code] = (quality.issues[code] || 0) + count;
    summary.total += total;
    const statusKey = row.status === 'aprovada' ? row.resolucaoStatus : row.status;
    if (['pendente', 'aberta', 'em_andamento', 'resolvida', 'rejeitada'].includes(statusKey)) summary[statusKey] += total;
    add(maps.categories, row.categoria, total);
    add(maps.neighborhoods, row.bairro, total);
    add(maps.sectors, row.setorResponsavel || 'Não informado', total);
    const month = row.day?.slice(0, 7);
    add(maps.months, month, total);
    if (row.categoria && month && total) {
      if (!categoryMonths.has(row.categoria)) categoryMonths.set(row.categoria, new Map());
      add(categoryMonths.get(row.categoria), month, total);
    }
    moderationSum += row.moderationSum;
    moderationSampleSize += row.moderationCount;
    resolutionSum += row.resolutionSum;
    resolutionSampleSize += row.resolutionCount;
  }
  summary.approved = summary.aberta + summary.em_andamento + summary.resolvida;
  summary.resolutionRate = summary.approved ? Math.round(summary.resolvida / summary.approved * 100) : 0;
  quality.excludedCount = quality.sourceCount - quality.validCount;
  quality.issues = Object.entries(quality.issues).map(([code, total]) => ({ code, label: ISSUE_LABELS[code], total })).sort((a, b) => a.code.localeCompare(b.code));
  const breakdown = Object.fromEntries(['categories', 'neighborhoods', 'sectors'].map(name => [name,
    [...maps[name]].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'))
  ]));
  const periods = [...maps.months.keys()].sort().slice(-12);
  const series = [...categoryMonths].map(([label, counts]) => ({ label,
    total: periods.reduce((sum, period) => sum + (counts.get(period) || 0), 0),
    values: periods.map(period => counts.get(period) || 0)
  })).filter(item => item.total).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, 'pt-BR'));
  return {
    summary, breakdown,
    metrics: { averageModerationHours: moderationSampleSize ? round(moderationSum / moderationSampleSize) : null,
      averageResolutionHours: resolutionSampleSize ? round(resolutionSum / resolutionSampleSize) : null,
      moderationSampleSize, resolutionSampleSize },
    trend: periods.map(period => ({ period, total: maps.months.get(period) })),
    ...(analytical ? { categoryTrend: { periods, series }, quality } : {})
  };
}

class AnalyticsService {
  static async indicators(user, query = {}, scope = 'analytical') {
    authorize(user, scope);
    const parsed = filters(query);
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
      const state = await AnalyticsStates.findByPk(1, { transaction });
      const run = state?.activeRunId ? await AnalyticsRuns.findByPk(state.activeRunId, { transaction }) : null;
      const read = async selected => run ? AnalyticsAggregates.findAll({ where: { runId: run.id, ...whereFor(selected, scope) }, raw: true, transaction }) : [];
      const result = summarize(await read(parsed), scope === 'analytical');
      let comparison;
      if (scope === 'analytical' && parsed.dataInicio && parsed.dataFim) {
        const start = new Date(`${parsed.dataInicio}T00:00:00.000Z`).getTime();
        const end = new Date(`${parsed.dataFim}T00:00:00.000Z`).getTime();
        const previous = { ...parsed, dataInicio: new Date(start - (end - start + 86400000)).toISOString().slice(0, 10), dataFim: new Date(start - 86400000).toISOString().slice(0, 10) };
        const previousSummary = summarize(await read(previous), false).summary;
        comparison = {
          current: { dataInicio: parsed.dataInicio, dataFim: parsed.dataFim, ...result.summary },
          previous: { dataInicio: previous.dataInicio, dataFim: previous.dataFim, ...previousSummary },
          changes: {
            totalPercent: change(result.summary.total, previousSummary.total),
            approvedPercent: change(result.summary.approved, previousSummary.approved),
            resolvedPercent: change(result.summary.resolvida, previousSummary.resolvida),
            rejectedPercent: change(result.summary.rejeitada, previousSummary.rejeitada),
            resolutionRatePoints: result.summary.resolutionRate - previousSummary.resolutionRate
          }
        };
      }
      return { scope, generatedAt: new Date().toISOString(), lastUpdatedAt: run?.completedAt || null,
        dataAsOf: run?.startedAt || null, status: run ? 'ready' : 'not_processed', filters: parsed,
        ...result, ...(comparison ? { comparison } : {}) };
    });
  }

  static async quality(user, query = {}) {
    authorize(user, 'analytical');
    const parsed = filters(query);
    const pageNumber = (value, fallback, max) => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new AppError('Paginação inválida.', 400, 'VALIDATION_ERROR');
      return Number(value);
    };
    const page = pageNumber(query.page, 1, 1000000), limit = pageNumber(query.limit, 20, 100);
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
      const state = await AnalyticsStates.findByPk(1, { transaction });
      const run = state?.activeRunId ? await AnalyticsRuns.findByPk(state.activeRunId, { transaction }) : null;
      const lastAttempt = await AnalyticsRuns.findOne({ order: [['id', 'DESC']], attributes: ['id', 'status', 'startedAt', 'completedAt', 'errorCode'], transaction });
      const where = { runId: run?.id || -1, ...whereFor(parsed, 'analytical') };
      const grouped = await AnalyticsAggregates.findAll({ where, raw: true, transaction });
      const { rows, count } = await AnalyticsFacts.findAndCountAll({ where: { ...where, hasIssues: true },
        attributes: ['denunciaId', 'issues', 'eligible'], order: [['denunciaId', 'ASC']], offset: (page - 1) * limit, limit, transaction });
      return { data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit),
        summary: summarize(grouped, true).quality, filters: parsed, lastUpdatedAt: run?.completedAt || null,
        lastAttempt, status: run ? 'ready' : 'not_processed' };
    });
  }
}
module.exports = AnalyticsService;
