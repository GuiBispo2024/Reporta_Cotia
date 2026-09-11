const request = require('supertest')
const app = require('../../app')
const { sequelize, User, Role, Permission } = require('../../models/rel')

async function registerAndLogin(username, email) {
  await request(app).post('/users').send({ username, email, password: '123456' })
  const login = await request(app).post('/users/login').send({ email, password: '123456' })
  return { token: login.body.token, userId: login.body.user.id }
}

describe('Autorização por permissão nas rotas', () => {
  let citizenToken
  let moderatorToken
  let legacyAdminToken

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    const moderationView = await Permission.create({
      key: 'moderation.view',
      description: 'Visualizar a fila de moderação.'
    })
    const moderatorRole = await Role.create({
      name: 'MODERATOR',
      description: 'Analisa denúncias e revisa conteúdos.'
    })
    await moderatorRole.addPermission(moderationView)

    const citizen = await registerAndLogin('citizen-route', 'citizen-route@example.com')
    citizenToken = citizen.token

    const moderator = await registerAndLogin('moderator-route', 'moderator-route@example.com')
    moderatorToken = moderator.token
    const moderatorUser = await User.findByPk(moderator.userId)
    await moderatorUser.addRole(moderatorRole)

    const legacyAdmin = await registerAndLogin('admin-route', 'admin-route@example.com')
    legacyAdminToken = legacyAdmin.token
    await User.update({ adm: true }, { where: { id: legacyAdmin.userId } })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  test('bloqueia cidadão sem moderation.view', async () => {
    const response = await request(app)
      .get('/denuncia/moderacao')
      .set('Authorization', `Bearer ${citizenToken}`)

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('FORBIDDEN')
  })

  test('autoriza moderador com moderation.view', async () => {
    const response = await request(app)
      .get('/denuncia/moderacao')
      .set('Authorization', `Bearer ${moderatorToken}`)

    expect(response.status).toBe(200)
  })

  test('mantém administrador legado autorizado durante a transição', async () => {
    const response = await request(app)
      .get('/denuncia/moderacao')
      .set('Authorization', `Bearer ${legacyAdminToken}`)

    expect(response.status).toBe(200)
  })
})
