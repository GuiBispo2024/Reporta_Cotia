const { sequelize, User, Role, Permission } = require('../../models/rel')

describe('Modelos de controle de acesso', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  test('relaciona um usuário a vários perfis', async () => {
    const user = await User.create({
      username: 'usuario-rbac',
      email: 'rbac@example.com',
      password: 'senha-de-teste'
    })
    const citizen = await Role.create({ name: 'CITIZEN', description: 'Cidadão' })
    const moderator = await Role.create({ name: 'MODERATOR', description: 'Moderador' })

    await user.setRoles([citizen, moderator])

    const roles = await user.getRoles({ order: [['name', 'ASC']] })
    expect(roles.map(role => role.name)).toEqual(['CITIZEN', 'MODERATOR'])
  })

  test('relaciona permissões aos perfis', async () => {
    const analyst = await Role.create({ name: 'ANALYST', description: 'Analista' })
    const permission = await Permission.create({
      key: 'dashboard.full.view',
      description: 'Consultar dashboard completo.'
    })

    await analyst.addPermission(permission)

    const permissions = await analyst.getPermissions()
    expect(permissions.map(item => item.key)).toContain('dashboard.full.view')
  })
})
