require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });
const { sequelize } = require('../models/rel');
const { runBatch } = require('../notifications/worker');
async function main() {
  const once = process.argv.includes('--once');
  let stopping = false;
  process.on('SIGTERM', () => { stopping = true; }); process.on('SIGINT', () => { stopping = true; });
  if (process.env.PUSH_DELIVERY_ENABLED !== 'true') { console.log(JSON.stringify({ component: 'push-worker', status: 'disabled' })); return; }
  await sequelize.authenticate();
  do {
    try { await runBatch({ batchSize: Number(process.env.PUSH_BATCH_SIZE || 20) }); }
    catch { console.error(JSON.stringify({ component: 'push-worker', errorCode: 'BATCH_FAILED' })); if (once) process.exitCode = 1; }
    if (!once && !stopping) await new Promise(resolve => setTimeout(resolve, 5000));
  } while (!once && !stopping);
}
if (require.main === module) main().catch(() => { console.error(JSON.stringify({ component: 'push-worker', errorCode: 'START_FAILED' })); process.exitCode = 1; }).finally(() => sequelize.close());
module.exports = { main };
