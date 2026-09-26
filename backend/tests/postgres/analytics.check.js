// Optional real-PostgreSQL smoke test. Only accepts a dedicated loopback test database.
// ANALYTICS_PG_TEST_URL=postgres://...@127.0.0.1:55439/reporta_cotia_analytics_test
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { Sequelize, DataTypes, Transaction } = require('sequelize');
const url = process.env.ANALYTICS_PG_TEST_URL;
if (!url) throw new Error('Defina ANALYTICS_PG_TEST_URL para o banco temporário de teste.');
const target = new URL(url);
if (target.hostname !== '127.0.0.1' || target.pathname !== '/reporta_cotia_analytics_test') {
  throw new Error('Este teste só aceita o banco reporta_cotia_analytics_test em 127.0.0.1.');
}
const sequelize = new Sequelize(url, { logging: false });
const dbPath = require.resolve('../../models/db/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { sequelize, Sequelize } };
const { Denuncia, DenunciaHistorico, AnalyticsFacts, AnalyticsAggregates, AnalyticsRuns } = require('../../models/rel');
const { refreshAnalytics } = require('../../analytics/process');
const AnalyticsService = require('../../services/AnalyticsService');
const migration = require('../../migrations/202609260001-create-analytics');
const user = { id: 1, permissions: ['dashboard.full.view'] };

function worker() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [__filename, '--worker'], { env: process.env, windowsHide: true });
    let output = '';
    child.stdout.on('data', value => { output += value; });
    child.stderr.on('data', value => { output += value; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(output.trim()) : reject(new Error(output)));
  });
}

(async () => {
  try {
    if (process.argv.includes('--worker')) {
      try { await refreshAnalytics(); console.log('SUCCESS'); }
      catch (error) {
        if (error.code !== 'ANALYTICS_BUSY') throw error;
        console.log('ANALYTICS_BUSY');
      }
      return;
    }
    await sequelize.sync({ force: true });
    await migration.down(sequelize.getQueryInterface());
    await migration.up(sequelize.getQueryInterface(), DataTypes);
    const report = await Denuncia.create({ titulo: 'Teste isolado', descricao: 'Não exportar', localizacao: 'Rua teste, Cotia', categoria: 'Outros', bairro: 'Centro', status: 'aprovada', resolucaoStatus: 'resolvida', createdAt: new Date('2026-01-01T00:00:00Z') });
    await DenunciaHistorico.bulkCreate([
      { denunciaId: report.id, tipo: 'moderacao', statusNovo: 'aprovada', createdAt: new Date('2026-01-02T00:00:00Z') },
      { denunciaId: report.id, tipo: 'resolucao', statusNovo: 'resolvida', createdAt: new Date('2026-01-04T00:00:00Z') }
    ]);
    await refreshAnalytics();
    const first = await AnalyticsService.indicators(user);
    assert.equal(first.summary.total, 1);
    assert.equal(first.metrics.averageModerationHours, 24);
    assert.equal(first.metrics.averageResolutionHours, 48);
    const indexes = await sequelize.getQueryInterface().showIndex('AnalyticsAggregates');
    assert(indexes.some(index => index.fields.map(field => field.attribute).join(',') === 'runId,bairro,day'));

    // A lock held by this connection must reject a different Node process.
    await sequelize.transaction(async transaction => {
      await sequelize.query('SELECT pg_advisory_xact_lock(260926, 1)', { transaction });
      assert.equal(await worker(), 'ANALYTICS_BUSY');
    });

    const insert = AnalyticsAggregates.bulkCreate;
    AnalyticsAggregates.bulkCreate = async () => { throw new Error('Injected write failure'); };
    try { await assert.rejects(refreshAnalytics, /Injected write failure/); }
    finally { AnalyticsAggregates.bulkCreate = insert; }
    assert.equal((await AnalyticsService.indicators(user)).lastUpdatedAt.toISOString(), first.lastUpdatedAt.toISOString());
    assert.equal(await AnalyticsFacts.count(), 1);
    assert.equal((await AnalyticsRuns.findOne({ order: [['id', 'DESC']] })).status, 'failed');

    // A reader keeps a coherent old version while another process publishes a new one.
    await Denuncia.create({ titulo: 'Nova', descricao: 'Teste', localizacao: 'Rua teste, Cotia', categoria: 'Outros', bairro: 'Centro', status: 'pendente', createdAt: new Date('2026-01-05') });
    await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async transaction => {
      assert.equal(await AnalyticsFacts.count({ transaction }), 1);
      assert.equal(await worker(), 'SUCCESS');
      assert.equal(await AnalyticsFacts.count({ transaction }), 1);
    });
    assert.equal((await AnalyticsService.indicators(user)).summary.total, 2);
    await refreshAnalytics();
    assert.equal(await AnalyticsFacts.count(), 2);
    await migration.down(sequelize.getQueryInterface());
    const tables = await sequelize.getQueryInterface().showAllTables();
    assert(!tables.includes('AnalyticsFacts'));
    assert(tables.includes('Denuncia'));
    console.log('PASS PostgreSQL: migration, indexes, metrics, inter-process lock, rollback, snapshot isolation, replay and down migration.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
