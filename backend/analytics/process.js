const { createHash } = require('crypto');
const { Op, Transaction } = require('sequelize');
const { sequelize, Denuncia, DenunciaHistorico, AnalyticsRuns, AnalyticsStates, AnalyticsFacts, AnalyticsAggregates } = require('../models/rel');
const { factFromReport } = require('./quality');
const AppError = require('../utils/AppError');

let running = false;
const dimensions = ['day', 'categoria', 'bairro', 'setorResponsavel', 'status', 'resolucaoStatus'];

async function refreshAnalytics() {
  if (running) throw new AppError('Já existe um processamento em execução.', 409, 'ANALYTICS_BUSY');
  running = true;
  let run;
  try {
    run = await AnalyticsRuns.create({ status: 'running', startedAt: new Date() });
    await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
      if (sequelize.getDialect() === 'postgres') {
        const [rows] = await sequelize.query('SELECT pg_try_advisory_xact_lock(260926, 1) AS acquired', { transaction });
        if (!rows[0].acquired) throw new AppError('Já existe um processamento em execução.', 409, 'ANALYTICS_BUSY');
      }
      const [state] = await AnalyticsStates.findOrCreate({ where: { id: 1 }, defaults: { activeRunId: null }, transaction });
      // All changes, including publication, are atomic. Readers keep the previous version on failure.
      await AnalyticsFacts.destroy({ where: {}, transaction });
      await AnalyticsAggregates.destroy({ where: {}, transaction });
      const groups = new Map();
      let lastId = 0, sourceCount = 0, validCount = 0, issueCount = 0;
      const now = new Date();
      while (true) {
        const reports = await Denuncia.findAll({
          where: { id: { [Op.gt]: lastId } }, order: [['id', 'ASC']], limit: 500,
          attributes: ['id', 'createdAt', 'categoria', 'bairro', 'localizacao', 'setorResponsavel', 'status', 'resolucaoStatus'],
          include: [{ model: DenunciaHistorico, attributes: ['id', 'tipo', 'statusNovo', 'createdAt'], separate: true }],
          transaction
        });
        if (!reports.length) break;
        const facts = reports.map(report => ({ ...factFromReport(report.get({ plain: true }), now), runId: run.id }));
        await AnalyticsFacts.bulkCreate(facts, { transaction });
        for (const fact of facts) {
          sourceCount++;
          validCount += Number(fact.eligible);
          issueCount += Number(fact.hasIssues);
          const values = Object.fromEntries(dimensions.map(field => [field, fact[field]]));
          const key = createHash('sha256').update(JSON.stringify(values)).digest('hex');
          if (!groups.has(key)) groups.set(key, {
            key, runId: run.id, ...values, sourceCount: 0, total: 0, issueCount: 0, issues: {},
            moderationSum: 0, moderationCount: 0, resolutionSum: 0, resolutionCount: 0
          });
          const group = groups.get(key);
          group.sourceCount++;
          group.total += Number(fact.eligible);
          group.issueCount += Number(fact.hasIssues);
          for (const code of fact.issues) group.issues[code] = (group.issues[code] || 0) + 1;
          for (const metric of ['moderation', 'resolution']) {
            if (fact[`${metric}Hours`] !== null) {
              group[`${metric}Sum`] += fact[`${metric}Hours`];
              group[`${metric}Count`]++;
            }
          }
        }
        lastId = reports[reports.length - 1].id;
      }
      const rows = [...groups.values()];
      for (let offset = 0; offset < rows.length; offset += 500) {
        await AnalyticsAggregates.bulkCreate(rows.slice(offset, offset + 500), { transaction });
      }
      await run.update({ status: 'success', completedAt: new Date(), sourceCount, validCount, issueCount }, { transaction });
      await state.update({ activeRunId: run.id }, { transaction });
    });
    return run.get({ plain: true });
  } catch (error) {
    if (run) await run.update({ status: 'failed', completedAt: new Date(), errorCode: error.code === 'ANALYTICS_BUSY' ? 'ANALYTICS_BUSY' : 'PROCESSING_FAILED' });
    throw error;
  } finally {
    running = false;
  }
}
module.exports = { refreshAnalytics };
