require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

async function runSeeds() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('As seeds de demonstração devem ser executadas apenas em desenvolvimento ou teste.');
  }
  const { sequelize } = require('../models/rel');
  await sequelize.authenticate();
  // Cria tabelas ausentes em bancos locais novos, sem force/alter.
  // Atualizações de tabelas existentes continuam sendo feitas pelas migrations.
  await sequelize.sync();
  await require('./accessControl.seed')();
  const users = await require('./user.seed')();
  const reports = await require('./denuncia.seed')({ users });
  const context = { users, reports };
  await require('./comment.seed')(context);
  await require('./like.seed')(context);
  await require('./share.seed')(context);
  console.log('Seeds de demonstração concluídas.');
  return context;
}

if (require.main === module) {
  runSeeds()
    .catch(error => { console.error('Erro nas seeds:', error); process.exitCode = 1; })
    .finally(async () => {
      if (process.env.NODE_ENV !== 'production') await require('../models/rel').sequelize.close();
    });
}

module.exports = runSeeds;
