const { Sequelize, DataTypes } = require('sequelize');
const migration = require('../../migrations/202609220001-add-heatmap-indexes');

describe('Migration dos índices do mapa de calor', () => {
  let sequelize;
  let queryInterface;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable('Denuncia', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false },
      categoria: { type: DataTypes.STRING(80), allowNull: false },
      setorResponsavel: { type: DataTypes.STRING(120), allowNull: true },
      bairro: { type: DataTypes.STRING(120), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false }
    });
  });

  afterEach(async () => {
    await sequelize.close();
  });

  test('adiciona e remove os índices de forma idempotente', async () => {
    await migration.up(queryInterface);
    await migration.up(queryInterface);

    const created = await queryInterface.showIndex('Denuncia');
    const createdNames = created.map(index => index.name);
    expect(createdNames).toEqual(expect.arrayContaining(
      migration.INDEXES.map(index => index.name)
    ));
    for (const expected of migration.INDEXES) {
      const index = created.find(item => item.name === expected.name);
      expect(index.fields.map(field => field.attribute)).toEqual(expected.fields);
    }

    await migration.down(queryInterface);
    await migration.down(queryInterface);
    const remaining = (await queryInterface.showIndex('Denuncia')).map(index => index.name);
    expect(remaining).not.toEqual(expect.arrayContaining(
      migration.INDEXES.map(index => index.name)
    ));
  });
});
