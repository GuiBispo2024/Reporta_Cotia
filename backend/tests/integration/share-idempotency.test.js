const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../../app');
const { sequelize, Denuncia, Share } = require('../../models/rel');
let token, report;
beforeAll(async () => {
  await sequelize.sync({ force: true });
  await request(app).post('/users').send({ username: 'share-test', email: 'share-test@example.org', password: '123456' });
  const login = await request(app).post('/users/login').send({ email: 'share-test@example.org', password: '123456' });
  token = login.body.token;
  report = await Denuncia.create({ userId: login.body.user.id, titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua A', status: 'aprovada', resolucaoStatus: 'aberta' });
});
afterAll(() => sequelize.close());
const post = (body) => request(app).post(`/denuncia/${report.id}/share`).set('Authorization', `Bearer ${token}`).send(body);
test('confirmação repetida mantém um registro e conflito de conteúdo é rejeitado', async () => {
  const clientRequestId = randomUUID();
  const first = await post({ clientRequestId }), second = await post({ clientRequestId });
  expect(first.status).toBe(201); expect(second.status).toBe(201);
  expect(second.body.share.id).toBe(first.body.share.id);
  expect(await Share.count()).toBe(1);
  expect((await post({ clientRequestId, comentario: 'Outro conteúdo' })).status).toBe(409);
  expect((await post({ clientRequestId: 'invalid' })).status).toBe(400);
  expect(await Share.count()).toBe(1);
});
test('clientes sem identificador continuam compatíveis e anônimo não altera contador', async () => {
  const before = await Share.count();
  expect((await request(app).post(`/denuncia/${report.id}/share`).send({ clientRequestId: randomUUID() })).status).toBe(401);
  expect(await Share.count()).toBe(before);
  expect((await post({})).status).toBe(201);
  expect(await Share.count()).toBe(before + 1);
});
