const request = require('supertest')
const app = require('../../app')
const { sequelize, User, Role, Permission, UserRoleHistory } = require('../../models/rel')

async function registerAndLogin(username, email) {
  const registration = await request(app)
    .post('/users')
    .send({ username, email, password: '123456' })
  const login = await request(app)
    .post('/users/login')
    .send({ email, password: '123456' })
  return { id: registration.body.user.id, token: login.body.token }
}

describe('Gerenciamento de perfis de acesso', () => {
  let admin
  let citizen

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    const manageRoles = await Permission.create({
      key: 'users.manage_roles',
      description: 'Gerenciar perfis de acesso dos usuários.'
    })
    const viewAudit = await Permission.create({
      key: 'audit.view',
      description: 'Consultar a trilha de auditoria.'
    })
    await Permission.create({
      key: 'moderation.view',
      description: 'Visualizar a fila de moderação.'
    })

    const adminRole = await Role.create({ name: 'ADMIN', description: 'Administrador' })
    await Role.create({ name: 'MODERATOR', description: 'Moderador' })
    await Role.create({ name: 'ANALYST', description: 'Analista' })
    await adminRole.addPermissions([manageRoles, viewAudit])

    admin = await registerAndLogin('role-admin', 'role-admin@example.com')
    citizen = await registerAndLogin('role-citizen', 'role-citizen@example.com')

    const adminUser = await User.findByPk(admin.id)
    await adminUser.addRole(adminRole)
  })

  afterAll(async () => {
    await sequelize.close()
  })

  test('impede cidadão de consultar os perfis disponíveis', async () => {
    const response = await request(app)
      .get('/users/access/roles')
      .set('Authorization', `Bearer ${citizen.token}`)

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('FORBIDDEN')
  })

  test('lista perfis e permissões para administrador', async () => {
    const response = await request(app)
      .get('/users/access/roles')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(response.status).toBe(200)
    expect(response.body.map(role => role.name)).toEqual([
      'ADMIN', 'ANALYST', 'CITIZEN', 'MODERATOR'
    ])
    expect(response.body.find(role => role.name === 'ADMIN').permissions)
      .toEqual(expect.arrayContaining([expect.objectContaining({ key: 'users.manage_roles' })]))
  })

  test('atribui perfil e mantém CITIZEN automaticamente', async () => {
    const response = await request(app)
      .put(`/users/${citizen.id}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['MODERATOR'] })

    expect(response.status).toBe(200)
    expect(response.body.user.roles).toEqual(expect.arrayContaining(['CITIZEN', 'MODERATOR']))
    expect(response.body.user).not.toHaveProperty('adm')

    const history = await UserRoleHistory.findOne({ where: { targetUserId: citizen.id } })
    expect(history).toMatchObject({
      targetUsername: 'role-citizen',
      changedByUserId: admin.id,
      changedByUsername: 'role-admin'
    })
    expect(history.previousRoles).toEqual(['CITIZEN'])
    expect(history.newRoles).toEqual(['CITIZEN', 'MODERATOR'])
  })

  test('não duplica a auditoria quando os perfis permanecem iguais', async () => {
    const historyCountBefore = await UserRoleHistory.count({
      where: { targetUserId: citizen.id }
    })

    const response = await request(app)
      .put(`/users/${citizen.id}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['MODERATOR', 'CITIZEN'] })

    expect(response.status).toBe(200)
    expect(response.body.user.roles).toEqual(expect.arrayContaining(['CITIZEN', 'MODERATOR']))
    await expect(UserRoleHistory.count({
      where: { targetUserId: citizen.id }
    })).resolves.toBe(historyCountBefore)
  })

  test('bloqueia consulta do histórico sem audit.view', async () => {
    const response = await request(app)
      .get('/users/access/role-history')
      .set('Authorization', `Bearer ${citizen.token}`)

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('FORBIDDEN')
  })

  test('atribui o perfil ADMIN sem depender de campo legado', async () => {
    const response = await request(app)
      .put(`/users/${citizen.id}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['CITIZEN', 'ADMIN'] })

    expect(response.status).toBe(200)
    expect(response.body.user.roles).toContain('ADMIN')
    expect(response.body.user).not.toHaveProperty('adm')
    const updatedUser = await User.findByPk(citizen.id, {
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
    })
    expect(updatedUser.roles.map(role => role.name)).toContain('ADMIN')
    expect(updatedUser.toJSON()).not.toHaveProperty('adm')
  })

  test('consulta o histórico e ordena do mais antigo', async () => {
    const response = await request(app)
      .get('/users/access/role-history?page=1&limit=1&sort=oldest')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ total: 2, page: 1, limit: 1, totalPages: 2 })
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0]).toMatchObject({
      targetUsername: 'role-citizen',
      changedByUsername: 'role-admin',
      previousRoles: ['CITIZEN'],
      newRoles: ['CITIZEN', 'MODERATOR']
    })
    expect(response.body.data[0]).not.toHaveProperty('targetUserId')
    expect(response.body.data[0]).not.toHaveProperty('changedByUserId')
    expect(response.body.data[0]).not.toHaveProperty('updatedAt')
  })

  test('ordena o histórico do mais recente por padrão', async () => {
    const response = await request(app)
      .get('/users/access/role-history')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(response.status).toBe(200)
    expect(response.body.data[0]).toMatchObject({
      previousRoles: ['CITIZEN', 'MODERATOR'],
      newRoles: ['ADMIN', 'CITIZEN']
    })
  })

  test('rejeita ordenação inválida no histórico de perfis', async () => {
    const response = await request(app)
      .get('/users/access/role-history?sort=invalido')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('INVALID_HISTORY_SORT')
  })

  test('inclui os perfis atuais na listagem administrativa', async () => {
    const response = await request(app)
      .get('/users?withCounts=true')
      .set('Authorization', `Bearer ${admin.token}`)

    expect(response.status).toBe(200)
    const listedCitizen = response.body.data.find(user => user.id === citizen.id)
    expect(listedCitizen.roles).toEqual(expect.arrayContaining(['CITIZEN', 'ADMIN']))
    expect(listedCitizen).not.toHaveProperty('adm')
  })

  test('não permite que administrador remova o próprio perfil ADMIN', async () => {
    const response = await request(app)
      .put(`/users/${admin.id}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['CITIZEN'] })

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('SELF_ADMIN_DEMOTION')
  })

  test('não permite que outro gestor remova o último perfil ADMIN', async () => {
    const removeSecondAdmin = await request(app)
      .put(`/users/${citizen.id}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['CITIZEN'] })
    expect(removeSecondAdmin.status).toBe(200)

    const accessManager = await registerAndLogin('access-manager', 'access-manager@example.com')
    const accessManagerRole = await Role.create({
      name: 'ACCESS_MANAGER',
      description: 'Gerencia perfis sem ser administrador.'
    })
    const manageRoles = await Permission.findOne({ where: { key: 'users.manage_roles' } })
    await accessManagerRole.addPermission(manageRoles)
    const accessManagerUser = await User.findByPk(accessManager.id)
    await accessManagerUser.addRole(accessManagerRole)

    const response = await request(app)
      .put(`/users/${admin.id}/roles`)
      .set('Authorization', `Bearer ${accessManager.token}`)
      .send({ roles: ['CITIZEN'] })

    expect(response.status).toBe(409)
    expect(response.body.code).toBe('LAST_ADMIN_REQUIRED')
    const protectedAdmin = await User.findByPk(admin.id, {
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
    })
    expect(protectedAdmin.roles.map(role => role.name)).toContain('ADMIN')
  })

  test('rejeita nomes de perfil que não existem', async () => {
    const response = await request(app)
      .put(`/users/${citizen.id}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['SUPERUSER'] })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('INVALID_ROLES')
  })
})
