require('dotenv').config({ quiet: true });
const { randomUUID, randomBytes } = require('crypto');
const assert = require('node:assert/strict');
const { sequelize, User, Denuncia, ReportSubmission } = require('../models/rel');
const service = require('../services/ReportSubmissionService');
async function main() {
  if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_URL || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost') || sequelize.getDialect() !== 'postgres') throw Error('Local development PostgreSQL required');
  const email = `submission-${randomUUID()}@example.invalid`;
  let user;
  try {
    user = await User.create({ username: `submission-${randomUUID()}`, email, password: randomBytes(32).toString('hex') });
    const key = randomUUID(); const input = { titulo: 'Teste temporário', descricao: 'Concorrência de envio', localizacao: 'Cotia' };
    const results = await Promise.all([service.create(input, [], user, key), service.create(input, [], user, key)]);
    assert.equal(results[0].denuncia.id, results[1].denuncia.id);
    assert.equal(await Denuncia.count({ where: { userId: user.id } }), 1);
    assert.equal(await ReportSubmission.count({ where: { userId: user.id } }), 1);
    await assert.rejects(service.create({ ...input, titulo: 'Outro conteúdo' }, [], user, key), (error) => error.code === 'IDEMPOTENCY_CONFLICT');
    console.log('PostgreSQL: envios concorrentes geram um protocolo; conflito de conteúdo rejeitado.');
  } finally {
    if (user) await User.destroy({ where: { id: user.id, email } });
    await sequelize.close();
  }
}
main().catch(() => { console.error('Falha no teste local de idempotência. Nenhuma credencial foi registrada.'); process.exitCode = 1; });
