const request = require('supertest')
const jwt = require('jsonwebtoken')
const app = require('../../app')
const { sequelize, User, Role, Permission, Denuncia, Comment } = require('../../models/rel')

async function registerAndLogin(username, email) {
  await request(app).post('/users').send({ username, email, password: '123456' })
  const login = await request(app).post('/users/login').send({ email, password: '123456' })
  return { token: login.body.token, userId: login.body.user.id }
}

describe('Autorização por permissão nas rotas', () => {
  let citizenToken
  let moderatorToken
  let viewerToken
  let auditorToken
  let admOnlyToken
  let reportId
  let commentId
  let citizenUserId

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    const permissions = await Permission.bulkCreate([
      { key: 'moderation.view', description: 'Visualizar a fila de moderação.' },
      { key: 'moderation.review', description: 'Aprovar ou rejeitar denúncias.' },
      { key: 'censorship.review', description: 'Revisar conteúdos censurados.' },
      { key: 'resolution.update', description: 'Atualizar o andamento de uma denúncia.' }
    ])
    const moderatorRole = await Role.create({
      name: 'MODERATOR',
      description: 'Analisa denúncias e revisa conteúdos.'
    })
    await moderatorRole.addPermissions(permissions)
    const viewerRole = await Role.create({
      name: 'QUEUE_VIEWER',
      description: 'Consulta a fila sem alterar ou revisar conteúdo sensível.'
    })
    await viewerRole.addPermission(permissions.find(permission => permission.key === 'moderation.view'))
    const readPermissions = await Permission.bulkCreate([
      { key: 'audit.view', description: 'Consultar a trilha de auditoria.' },
      { key: 'users.view', description: 'Consultar a listagem administrativa de usuários.' }
    ])
    const auditorRole = await Role.create({
      name: 'READ_AUDITOR',
      description: 'Consulta auditoria e dados administrativos sem moderar.'
    })
    await auditorRole.addPermissions(readPermissions)

    const citizen = await registerAndLogin('citizen-route', 'citizen-route@example.com')
    citizenToken = citizen.token
    citizenUserId = citizen.userId

    const report = await Denuncia.create({
      titulo: 't****',
      tituloOriginal: 'termo',
      tituloCensurado: true,
      descricao: 'Descrição para moderação',
      localizacao: 'Cotia - SP',
      categoria: 'Outros',
      status: 'pendente',
      userId: citizen.userId
    })
    reportId = report.id
    const comment = await Comment.create({
      comentario: 't****',
      comentarioOriginal: 'termo',
      censurado: true,
      userId: citizen.userId,
      denunciaId: report.id
    })
    commentId = comment.id

    const moderator = await registerAndLogin('moderator-route', 'moderator-route@example.com')
    moderatorToken = moderator.token
    const moderatorUser = await User.findByPk(moderator.userId)
    await moderatorUser.addRole(moderatorRole)

    const viewer = await registerAndLogin('viewer-route', 'viewer-route@example.com')
    viewerToken = viewer.token
    const viewerUser = await User.findByPk(viewer.userId)
    await viewerUser.addRole(viewerRole)

    const auditor = await registerAndLogin('auditor-route', 'auditor-route@example.com')
    auditorToken = auditor.token
    const auditorUser = await User.findByPk(auditor.userId)
    await auditorUser.addRole(auditorRole)

    const admOnlyUser = await registerAndLogin('admin-route', 'admin-route@example.com')
    admOnlyToken = jwt.sign(
      { id: admOnlyUser.userId, adm: true, v: 0 },
      process.env.JWT_SECRET || 'reporta-cotia-test-secret',
      { expiresIn: '30m' }
    )
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
    expect(response.body[0].tituloOriginal).toBe('termo')
  })

  test('oculta conteúdo sensível de quem possui somente moderation.view', async () => {
    const queueResponse = await request(app)
      .get('/denuncia/moderacao')
      .set('Authorization', `Bearer ${viewerToken}`)
    const detailResponse = await request(app)
      .get(`/denuncia/${reportId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
    const historyResponse = await request(app)
      .get(`/denuncia/${reportId}/historico`)
      .set('Authorization', `Bearer ${viewerToken}`)

    expect(queueResponse.status).toBe(200)
    expect(queueResponse.body[0]).not.toHaveProperty('tituloOriginal')
    expect(detailResponse.status).toBe(200)
    expect(detailResponse.body).not.toHaveProperty('tituloOriginal')
    expect(historyResponse.status).toBe(404)
  })

  test('permite que moderation.view consulte denúncias privadas de outro usuário', async () => {
    const response = await request(app)
      .get(`/denuncia/user/${citizenUserId}`)
      .set('Authorization', `Bearer ${viewerToken}`)

    expect(response.status).toBe(200)
  })

  test('autoriza histórico privado somente com audit.view', async () => {
    const response = await request(app)
      .get(`/denuncia/${reportId}/historico`)
      .set('Authorization', `Bearer ${auditorToken}`)

    expect(response.status).toBe(200)
  })

  test('expõe e-mail da comunidade somente com users.view', async () => {
    const [citizenResponse, auditorResponse] = await Promise.all([
      request(app).get('/users?withCounts=true').set('Authorization', `Bearer ${citizenToken}`),
      request(app).get('/users?withCounts=true').set('Authorization', `Bearer ${auditorToken}`)
    ])

    expect(citizenResponse.body.data[0]).not.toHaveProperty('email')
    expect(auditorResponse.body.data[0]).toHaveProperty('email')
  })

  test('bloqueia cidadão nas ações de moderação', async () => {
    const endpoints = [
      request(app).patch(`/denuncia/${reportId}/moderar`).send({ status: 'aprovada' }),
      request(app).patch(`/denuncia/${reportId}/censura`).send({ field: 'titulo', manterCensura: false }),
      request(app).patch(`/denuncia/${reportId}/resolucao`).send({ resolucaoStatus: 'em_andamento' }),
      request(app).patch(`/denuncia/comentario/${commentId}/censura`).send({ manterCensura: false })
    ]

    const responses = await Promise.all(endpoints.map(pending => pending.set('Authorization', `Bearer ${citizenToken}`)))
    expect(responses.map(response => response.status)).toEqual([403, 403, 403, 403])
    expect(responses.every(response => response.body.code === 'FORBIDDEN')).toBe(true)
  })

  test('autoriza moderador a aprovar denúncia com moderation.review', async () => {
    const response = await request(app)
      .patch(`/denuncia/${reportId}/moderar`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ status: 'aprovada' })

    expect(response.status).toBe(200)
    expect(response.body.denuncia.status).toBe('aprovada')
  })

  test('entrega texto original censurado somente a quem pode revisar', async () => {
    const [citizenResponse, moderatorResponse] = await Promise.all([
      request(app).get(`/denuncia/${reportId}/comentarios`).set('Authorization', `Bearer ${citizenToken}`),
      request(app).get(`/denuncia/${reportId}/comentarios`).set('Authorization', `Bearer ${moderatorToken}`)
    ])

    expect(citizenResponse.status).toBe(200)
    expect(citizenResponse.body.comments[0]).not.toHaveProperty('comentarioOriginal')
    expect(moderatorResponse.status).toBe(200)
    expect(moderatorResponse.body.comments[0].comentarioOriginal).toBe('termo')
  })

  test('autoriza moderador a revisar censura com censorship.review', async () => {
    const reportResponse = await request(app)
      .patch(`/denuncia/${reportId}/censura`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ field: 'titulo', manterCensura: false })
    const commentResponse = await request(app)
      .patch(`/denuncia/comentario/${commentId}/censura`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ manterCensura: false })

    expect(reportResponse.status).toBe(200)
    expect(reportResponse.body.censurado).toBe(false)
    expect(commentResponse.status).toBe(200)
    expect(commentResponse.body.censurado).toBe(false)
  })

  test('autoriza moderador a atualizar resolução com resolution.update', async () => {
    const response = await request(app)
      .patch(`/denuncia/${reportId}/resolucao`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ resolucaoStatus: 'em_andamento', setorResponsavel: 'A definir' })

    expect(response.status).toBe(200)
    expect(response.body.resolucaoStatus).toBe('em_andamento')
  })

  test('não autoriza a claim adm de um token legado sem a permissão exigida', async () => {
    const response = await request(app)
      .get('/denuncia/moderacao')
      .set('Authorization', `Bearer ${admOnlyToken}`)

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('FORBIDDEN')
  })
})
