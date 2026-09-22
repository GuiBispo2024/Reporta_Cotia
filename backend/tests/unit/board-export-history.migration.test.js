const { Sequelize } = require('sequelize');
const migration = require('../../migrations/202609200003-create-board-export-histories');

describe('Migration da auditoria de exportações do board', () => {
  let sequelize;
  let queryInterface;

  beforeEach(() => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  test('cria a tabela e o índice da auditoria e permite rollback', async () => {
    await migration.up(queryInterface, Sequelize);
    const table = await queryInterface.describeTable('BoardExportHistories');
    expect(table).toEqual(expect.objectContaining({
      userId: expect.objectContaining({ allowNull: false }),
      format: expect.objectContaining({ allowNull: false }),
      filters: expect.objectContaining({ allowNull: false }),
      recordCount: expect.objectContaining({ allowNull: false })
    }));
    expect((await queryInterface.showIndex('BoardExportHistories')).map(index => index.name))
      .toContain('board_export_histories_user_created_at');

    await migration.down(queryInterface);
    await expect(queryInterface.describeTable('BoardExportHistories')).rejects.toThrow();
  });
});
