const { Sequelize, DataTypes } = require('sequelize')
const migration = require('../../migrations/202609120002-remove-adm-from-users')

describe('Migration de remoção do campo adm', () => {
  let sequelize
  let queryInterface

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
    queryInterface = sequelize.getQueryInterface()

    await queryInterface.createTable('Users', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING, allowNull: false },
      adm: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    })
    await queryInterface.createTable('Roles', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false }
    })
    await queryInterface.createTable('UserRoles', {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      roleId: { type: DataTypes.INTEGER, allowNull: false }
    })

    await queryInterface.bulkInsert('Users', [
      { id: 1, username: 'admin', adm: true },
      { id: 2, username: 'cidadao', adm: false }
    ])
    await queryInterface.bulkInsert('Roles', [{ id: 1, name: 'ADMIN' }])
    await queryInterface.bulkInsert('UserRoles', [{ userId: 1, roleId: 1 }])
  })

  afterEach(async () => {
    await sequelize.close()
  })

  test('remove a coluna e a restaura a partir da role ADMIN no rollback', async () => {
    await migration.up(queryInterface)
    expect((await queryInterface.describeTable('Users')).adm).toBeUndefined()

    await migration.down(queryInterface, Sequelize)
    expect((await queryInterface.describeTable('Users')).adm).toBeDefined()

    const users = await sequelize.query(
      'SELECT "id", "adm" FROM "Users" ORDER BY "id"',
      { type: Sequelize.QueryTypes.SELECT }
    )
    expect(Boolean(users[0].adm)).toBe(true)
    expect(Boolean(users[1].adm)).toBe(false)
  })
})
