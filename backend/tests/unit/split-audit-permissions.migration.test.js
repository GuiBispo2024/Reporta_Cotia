const { Sequelize, DataTypes } = require('sequelize')
const migration = require('../../migrations/202609200001-split-audit-permissions')

describe('Migration de separação das permissões de auditoria', () => {
  let sequelize
  let queryInterface

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
    queryInterface = sequelize.getQueryInterface()

    await queryInterface.createTable('Roles', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false, unique: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    })
    await queryInterface.createTable('Permissions', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      key: { type: DataTypes.STRING, allowNull: false, unique: true },
      description: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    })
    await queryInterface.createTable('RolePermissions', {
      roleId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      permissionId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    })

    const now = new Date()
    await queryInterface.bulkInsert('Roles', [
      { id: 1, name: 'CITIZEN', createdAt: now, updatedAt: now },
      { id: 2, name: 'MODERATOR', createdAt: now, updatedAt: now },
      { id: 3, name: 'ADMIN', createdAt: now, updatedAt: now }
    ])
    await queryInterface.bulkInsert('Permissions', [{
      id: 1,
      key: 'audit.view',
      description: 'Consultar a trilha de auditoria.',
      createdAt: now,
      updatedAt: now
    }])
    await queryInterface.bulkInsert('RolePermissions', [{
      roleId: 3,
      permissionId: 1,
      createdAt: now,
      updatedAt: now
    }])
  })

  afterEach(async () => {
    await sequelize.close()
  })

  test('separa os domínios e concede ao moderador somente a auditoria de denúncias', async () => {
    await migration.up(queryInterface, Sequelize)

    const assignments = await sequelize.query(`
      SELECT r.name AS role, p.key AS permission
      FROM RolePermissions rp
      INNER JOIN Roles r ON r.id = rp.roleId
      INNER JOIN Permissions p ON p.id = rp.permissionId
      ORDER BY r.name, p.key
    `, { type: Sequelize.QueryTypes.SELECT })

    expect(assignments).toEqual([
      { role: 'ADMIN', permission: 'denuncia.audit.view' },
      { role: 'ADMIN', permission: 'users.audit.view' },
      { role: 'MODERATOR', permission: 'denuncia.audit.view' }
    ])
    expect(await sequelize.query(
      'SELECT id FROM Permissions WHERE key = :key',
      { replacements: { key: 'audit.view' }, type: Sequelize.QueryTypes.SELECT }
    )).toHaveLength(0)

    await migration.down(queryInterface, Sequelize)
    const rollbackAssignments = await sequelize.query(`
      SELECT r.name AS role, p.key AS permission
      FROM RolePermissions rp
      INNER JOIN Roles r ON r.id = rp.roleId
      INNER JOIN Permissions p ON p.id = rp.permissionId
    `, { type: Sequelize.QueryTypes.SELECT })
    expect(rollbackAssignments).toEqual([{ role: 'ADMIN', permission: 'audit.view' }])
  })
})
