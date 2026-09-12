const request = require('supertest')
const app = require('../../app')
const { sequelize, Denuncia, User, Comment, Role, Permission } = require('../../models/rel')

describe('Interações sociais e sessões', () => {
  let token
  let denunciaId

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    await request(app).post('/users').send({ username: 'socialuser', email: 'social@example.com', password: '123456' })
    const login = await request(app).post('/users/login').send({ email: 'social@example.com', password: '123456' })
    token = login.body.token
    const moderationPermissions = await Permission.bulkCreate([
      { key: 'moderation.view', description: 'Visualizar a fila de moderação.' },
      { key: 'moderation.review', description: 'Aprovar ou rejeitar denúncias.' },
      { key: 'resolution.update', description: 'Atualizar o andamento de uma denúncia.' }
    ])
    const moderatorRole = await Role.create({ name: 'MODERATOR', description: 'Analisa denúncias e revisa conteúdos.' })
    await moderatorRole.addPermissions(moderationPermissions)
    const user = await User.findByPk(login.body.user.id)
    await user.addRole(moderatorRole)
    const report = await Denuncia.create({ titulo: 'Iluminação quebrada', descricao: 'Poste apagado há vários dias', localizacao: 'Rua Central', categoria: 'Iluminação pública', status: 'aprovada', userId: login.body.user.id })
    denunciaId = report.id
  })

  test('cria, lista, atualiza e remove comentário', async () => {
    const created = await request(app).post(`/denuncia/${denunciaId}/comentario`).set('Authorization', `Bearer ${token}`).send({ comentario: 'Precisa de manutenção.' })
    expect(created.status).toBe(201)
    const id = created.body.comentario.id
    expect((await request(app).get(`/denuncia/${denunciaId}/comentarios`).query({ page: 1, limit: 10 })).body.totalComments).toBe(1)
    expect((await request(app).put(`/denuncia/comentario/${id}`).set('Authorization', `Bearer ${token}`).send({ comentario: 'Manutenção urgente.' })).status).toBe(200)
    expect((await request(app).delete(`/denuncia/comentario/${id}`).set('Authorization', `Bearer ${token}`)).status).toBe(200)
  })

  test('responde um comentário com somente um nível', async () => {
    const parent = await request(app).post(`/denuncia/${denunciaId}/comentario`).set('Authorization', `Bearer ${token}`).send({ comentario: 'Comentário principal.' })
    const reply = await request(app).post(`/denuncia/${denunciaId}/comentario`).set('Authorization', `Bearer ${token}`).send({ comentario: 'Esta é uma resposta.', parentCommentId: parent.body.comentario.id })
    expect(reply.status).toBe(201)
    const nested = await request(app).post(`/denuncia/${denunciaId}/comentario`).set('Authorization', `Bearer ${token}`).send({ comentario: 'Nível extra.', parentCommentId: reply.body.comentario.id })
    expect(nested.status).toBe(400)
    const list = await request(app).get(`/denuncia/${denunciaId}/comentarios`)
    expect(list.body.comments[0].Replies).toHaveLength(1)
    await request(app).delete(`/denuncia/comentario/${parent.body.comentario.id}`).set('Authorization', `Bearer ${token}`)
  })

  test('ordena comentários dos mais antigos ou mais recentes', async () => {
    const older = await Comment.create({ comentario: 'Comentário antigo', denunciaId, userId: 1, createdAt: new Date('2025-01-01T10:00:00Z'), updatedAt: new Date('2025-01-01T10:00:00Z') })
    const newer = await Comment.create({ comentario: 'Comentário recente', denunciaId, userId: 1, createdAt: new Date('2025-01-02T10:00:00Z'), updatedAt: new Date('2025-01-02T10:00:00Z') })

    const oldestFirst = await request(app).get(`/denuncia/${denunciaId}/comentarios`).query({ sort: 'oldest' })
    const newestFirst = await request(app).get(`/denuncia/${denunciaId}/comentarios`).query({ sort: 'newest' })

    expect(oldestFirst.body.comments[0].id).toBe(older.id)
    expect(newestFirst.body.comments[0].id).toBe(newer.id)
    await Comment.destroy({ where: { id: [older.id, newer.id] } })
  })

  test('curte, pagina o histórico e descurte', async () => {
    expect((await request(app).post(`/denuncia/${denunciaId}/like`).set('Authorization', `Bearer ${token}`)).status).toBe(201)
    const list = await request(app).get(`/denuncia/${denunciaId}/likes`).query({ page: 1, limit: 10 })
    expect(list.body.total).toBe(1)
    expect((await request(app).delete(`/denuncia/${denunciaId}/like`).set('Authorization', `Bearer ${token}`)).status).toBe(200)
  })

  test('registra, pagina e remove compartilhamento', async () => {
    const created = await request(app).post(`/denuncia/${denunciaId}/share`).set('Authorization', `Bearer ${token}`).send({ comentario: 'Vamos divulgar.' })
    expect(created.status).toBe(201)
    const list = await request(app).get(`/denuncia/${denunciaId}/shares`).query({ page: 1, limit: 10 })
    expect(list.body.totalShares).toBe(1)
    expect((await request(app).delete(`/denuncia/share/${created.body.share.id}`).set('Authorization', `Bearer ${token}`)).status).toBe(200)
  })

  test('remove curtidas e compartilhamentos quando a denúncia deixa de ser aprovada', async () => {
    const report = await Denuncia.create({ titulo: 'Registro para rejeitar', descricao: 'Descrição válida', localizacao: 'Rua C', categoria: 'Outros', status: 'aprovada', userId: 1 })
    await request(app).post(`/denuncia/${report.id}/like`).set('Authorization', `Bearer ${token}`)
    await request(app).post(`/denuncia/${report.id}/share`).set('Authorization', `Bearer ${token}`).send({ comentario: 'Registro anterior' })

    const rejected = await request(app).patch(`/denuncia/${report.id}/moderar`).set('Authorization', `Bearer ${token}`).send({ status: 'rejeitada', motivoRejeicao: 'Precisa de correção.' })

    expect(rejected.status).toBe(200)
    expect(await sequelize.models.Like.count({ where: { denunciaId: report.id } })).toBe(0)
    expect(await sequelize.models.Share.count({ where: { denunciaId: report.id } })).toBe(0)
  })

  test('bloqueia interação em denúncia pendente', async () => {
    const report = await Denuncia.create({ titulo: 'Pendente', descricao: 'Ainda em análise', localizacao: 'Rua A', status: 'pendente', userId: 1 })
    expect((await request(app).get(`/denuncia/${report.id}/likes`)).status).toBe(404)
    expect((await request(app).get(`/denuncia/${report.id}/comentarios`)).status).toBe(404)
    expect((await request(app).get(`/denuncia/${report.id}/shares`)).status).toBe(404)
  })

  test('pagina participantes e denúncias públicas do perfil', async () => {
    const users = await request(app).get('/users/denunciaCount').set('Authorization', `Bearer ${token}`).query({ page: 1, limit: 10, sort: 'contributions' })
    expect(users.status).toBe(200)
    expect(users.body.data.length).toBeGreaterThan(0)
    const reports = await request(app).get('/denuncia/public/user/1').query({ page: 1, limit: 10 })
    expect(reports.status).toBe(200)
    expect(reports.body.total).toBe(1)
  })

  test('pagina separadamente a fila de moderação', async () => {
    const pending = await request(app).get('/denuncia/moderacao').set('Authorization', `Bearer ${token}`).query({ status: 'pendente', page: 1, limit: 12 })
    const approved = await request(app).get('/denuncia/moderacao').set('Authorization', `Bearer ${token}`).query({ status: 'aprovada', page: 1, limit: 12 })
    expect(pending.status).toBe(200)
    expect(approved.status).toBe(200)
    expect(Array.isArray(pending.body.data)).toBe(true)
    expect(Array.isArray(approved.body.data)).toBe(true)
  })

  test('salva o setor responsável e o publica na denúncia', async () => {
    const updated = await request(app)
      .patch(`/denuncia/${denunciaId}/resolucao`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        resolucaoStatus: 'em_andamento',
        setorResponsavel: 'Secretaria de Infraestrutura e Obras'
      })

    expect(updated.status).toBe(200)
    expect(updated.body.setorResponsavel).toBe('Secretaria de Infraestrutura e Obras')

    const report = await request(app).get(`/denuncia/${denunciaId}`)
    expect(report.body.resolucaoStatus).toBe('em_andamento')
    expect(report.body.setorResponsavel).toBe('Secretaria de Infraestrutura e Obras')

    const historyBefore = await request(app).get(`/denuncia/${denunciaId}/historico`).set('Authorization', `Bearer ${token}`)
    const repeated = await request(app)
      .patch(`/denuncia/${denunciaId}/resolucao`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolucaoStatus: 'em_andamento', setorResponsavel: 'Secretaria de Infraestrutura e Obras' })
    const historyAfter = await request(app).get(`/denuncia/${denunciaId}/historico`).set('Authorization', `Bearer ${token}`)
    expect(repeated.body.changed).toBe(false)
    expect(historyAfter.body).toHaveLength(historyBefore.body.length)
  })

  test('registra a rastreabilidade com motivo e sem campos removidos', async () => {
    const pending = await Denuncia.create({
      titulo: 'Registro para revisar',
      descricao: 'Descrição do registro',
      localizacao: 'Rua B',
      status: 'pendente',
      userId: 1
    })
    const moderation = await request(app)
      .patch(`/denuncia/${pending.id}/moderar`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejeitada', motivoRejeicao: 'Endereço insuficiente.' })
    expect(moderation.status).toBe(200)

    const history = await request(app)
      .get(`/denuncia/${pending.id}/historico`)
      .set('Authorization', `Bearer ${token}`)
    expect(history.status).toBe(200)
    expect(history.body[0].motivo).toBe('Endereço insuficiente.')
    expect(history.body[0]).not.toHaveProperty('nota')
    expect(history.body[0]).not.toHaveProperty('evidenciaUrl')
  })

  test('logout revoga o token usado', async () => {
    expect((await request(app).post('/users/logout').set('Authorization', `Bearer ${token}`)).status).toBe(200)
    expect((await request(app).get('/users/me').set('Authorization', `Bearer ${token}`)).status).toBe(401)
  })
})
