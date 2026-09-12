const request = require('supertest')
const app = require('../../app')
const { sequelize, User, Role, Permission } = require('../../models/rel')

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
    await Permission.create({
      key: 'moderation.view',
      description: 'Visualizar a fila de moderação.'
    })

    const adminRole = await Role.create({ name: 'ADMIN', description: 'Administrador' })
    await Role.create({ name: 'MODERATOR', description: 'Moderador' })
    await Role.create({ name: 'ANALYST', description: 'Analista' })
    await adminRole.addPermission(manageRoles)

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

  test('rejeita nomes de perfil que não existem', async () => {
    const response = await request(app)
      .put(`/users/${citizen.id}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['SUPERUSER'] })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('INVALID_ROLES')
  })
})
