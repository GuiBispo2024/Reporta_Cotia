require('dotenv').config({ quiet: true });
const { randomUUID, randomBytes } = require('crypto');
const assert = require('node:assert/strict');
const { sequelize, User, Denuncia, Share } = require('../models/rel');
const service = require('../services/ShareService');
async function main() {
  if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_URL || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost') || sequelize.getDialect() !== 'postgres') throw Error('Local development PostgreSQL required');
  const email = `share-${randomUUID()}@example.invalid`;
  let user;
  try {
    user = await User.create({ username: `share-${randomUUID()}`, email, password: randomBytes(32).toString('hex') });
    const report = await Denuncia.create({ userId: user.id, titulo: 'Teste temporário', descricao: 'Concorrência de registro', localizacao: 'Cotia', status: 'aprovada', resolucaoStatus: 'aberta' });
    const input = { denunciaId: report.id, clientRequestId: randomUUID() };
    const results = await Promise.all([service.compartilhar(input, user), service.compartilhar(input, user)]);
    assert.equal(results[0].share.id, results[1].share.id);
    assert.equal(await Share.count({ where: { userId: user.id } }), 1);
    await assert.rejects(service.compartilhar({ ...input, comentario: 'Outro conteúdo' }, user), (error) => error.code === 'IDEMPOTENCY_CONFLICT');
    console.log('PostgreSQL: confirmações concorrentes registram um compartilhamento; conflito rejeitado.');
  } finally {
    if (user) await User.destroy({ where: { id: user.id, email } });
    await sequelize.close();
  }
}
main().catch(() => { console.error('Falha na verificação local de compartilhamento. Nenhuma credencial foi registrada.'); process.exitCode = 1; });
