const { Sequelize, DataTypes } = require('sequelize');
const migration = require('../../migrations/202609200002-add-bairro-to-denuncias');

describe('Migration do bairro da denúncia', () => {
  let sequelize;
  let queryInterface;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable('Denuncia', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
    });
  });

  afterEach(async () => {
    await sequelize.close();
  });

  test('adiciona e remove a coluna nullable de forma idempotente', async () => {
    await migration.up(queryInterface, Sequelize);
    await migration.up(queryInterface, Sequelize);
    const added = await queryInterface.describeTable('Denuncia');
    expect(added.bairro).toBeDefined();
    expect(added.bairro.allowNull).toBe(true);

    await migration.down(queryInterface);
    await migration.down(queryInterface);
    expect((await queryInterface.describeTable('Denuncia')).bairro).toBeUndefined();
  });
});
