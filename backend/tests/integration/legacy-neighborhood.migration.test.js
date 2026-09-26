const { sequelize, Denuncia } = require('../../models/rel');
const Sequelize = require('sequelize');
const migration = require('../../migrations/202609260003-backfill-legacy-neighborhoods');
beforeAll(() => sequelize.sync({ force: true }));
afterAll(() => sequelize.close());
test('repairs only unambiguous legacy addresses and preserves explicit neighborhoods', async () => {
  const create = values => Denuncia.create({ titulo: 'Teste', descricao: 'Teste', localizacao: 'Rua A', ...values });
  const recoverable = await create({ localizacao: 'Rua A - Parque Mirante da Mata - Cotia - São Paulo' });
  const explicit = await create({ localizacao: 'Rua A - Outro - Cotia - SP', bairro: 'Bairro confirmado' });
  const ambiguous = await create({ localizacao: 'Rua A, Cotia' });
  await migration.up(sequelize.getQueryInterface(), Sequelize);
  await migration.up(sequelize.getQueryInterface(), Sequelize);
  expect((await recoverable.reload()).bairro).toBe('Parque Mirante da Mata');
  expect((await explicit.reload()).bairro).toBe('Bairro confirmado');
  expect((await ambiguous.reload()).bairro).toBeNull();
});
