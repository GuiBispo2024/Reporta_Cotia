require('dotenv').config({ quiet: true });
const SessionService = require('../services/SessionService');
const { sequelize } = require('../models/rel');
(async () => {
  try { await sequelize.authenticate(); console.log(`Sessões expiradas removidas: ${await SessionService.pruneExpired()}`); }
  catch { console.error('Não foi possível remover sessões expiradas.'); process.exitCode = 1; }
  finally { await sequelize.close(); }
})();
