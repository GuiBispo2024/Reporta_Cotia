require('dotenv').config();
const { sequelize } = require('../models/rel');
const { refreshAnalytics } = require('../analytics/process');

(async () => {
  try {
    const run = await refreshAnalytics();
    console.log(JSON.stringify({ runId: run.id, status: run.status, sourceCount: run.sourceCount, validCount: run.validCount, issueCount: run.issueCount, completedAt: run.completedAt }));
  } catch (error) {
    console.error('Falha no processamento analítico. Consulte AnalyticsRuns.', error.code === 'ANALYTICS_BUSY' ? 'ANALYTICS_BUSY' : 'PROCESSING_FAILED');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
