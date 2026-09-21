const { Sequelize, DataTypes } = require('sequelize');
const migration = require('../../migrations/202609200004-add-dashboard-audit-permission');

describe('Migration da permissão de auditoria do dashboard', () => {
  let sequelize;
  let queryInterface;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    queryInterface = sequelize.getQueryInterface();
    await queryInterface.createTable('Permissions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.createTable('Roles', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.createTable('RolePermissions', {
      roleId: { type: DataTypes.INTEGER, allowNull: false },
      permissionId: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    const now = new Date();
    await queryInterface.bulkInsert('Roles', [
      { id: 1, name: 'ADMIN', description: 'Administrador', createdAt: now, updatedAt: now },
      { id: 2, name: 'ANALYST', description: 'Analista', createdAt: now, updatedAt: now }
    ]);
  });

  afterEach(async () => {
    await sequelize.close();
  });

  test('atribui a permissão apenas ao administrador e desfaz a alteração', async () => {
    await migration.up(queryInterface, Sequelize);
    await migration.up(queryInterface, Sequelize);
    const [permission] = await sequelize.query(
      'SELECT "id" FROM "Permissions" WHERE "key" = :key',
      { replacements: { key: 'dashboard.audit.view' }, type: Sequelize.QueryTypes.SELECT }
    );
    const assignments = await sequelize.query(
      'SELECT "roleId" FROM "RolePermissions" WHERE "permissionId" = :permissionId ORDER BY "roleId"',
      { replacements: { permissionId: permission.id }, type: Sequelize.QueryTypes.SELECT }
    );
    expect(assignments).toEqual([{ roleId: 1 }]);

    await migration.down(queryInterface, Sequelize);
    expect(await sequelize.query(
      'SELECT "id" FROM "Permissions" WHERE "key" = :key',
      { replacements: { key: 'dashboard.audit.view' }, type: Sequelize.QueryTypes.SELECT }
    )).toEqual([]);
  });
});
