const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../../app');
const { sequelize, Denuncia, ReportSubmission } = require('../../models/rel');
const seed = require('../../seed/accessControl.seed');
const payload = { titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua A' };
let token, otherToken;
beforeAll(async () => {
  await sequelize.sync({ force: true }); await seed();
  for (const email of ['submission@example.org', 'other@example.org']) {
    await request(app).post('/users').send({ username: email, email, password: '123456' });
    const login = await request(app).post('/users/login').send({ email, password: '123456' });
    if (!token) token = login.body.token; else otherToken = login.body.token;
  }
});
afterAll(() => sequelize.close());
const post = (key, body = payload) => request(app).post('/denuncia').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send(body);
test('mesmo identificador recupera protocolo e não duplica a denúncia', async () => {
  const key = randomUUID(); const first = await post(key); const second = await post(key);
  expect(first.status).toBe(201); expect(second.status).toBe(201);
  expect(second.body).toEqual(first.body);
  expect(await Denuncia.count()).toBe(1);
  const receipt = await request(app).get(`/denuncia/submissions/${key}`).set('Authorization', `Bearer ${token}`);
  expect(receipt.body.denuncia.id).toBe(first.body.denuncia.id);
  expect((await request(app).get(`/denuncia/submissions/${key}`).set('Authorization', `Bearer ${otherToken}`)).status).toBe(404);
  expect((await post(key, { ...payload, titulo: 'Outro' })).status).toBe(409);
});
test('falha ao gravar comprovante desfaz denúncia; chave inválida é rejeitada', async () => {
  const count = await Denuncia.count();
  const spy = jest.spyOn(ReportSubmission, 'create').mockRejectedValueOnce(Error('storage failure'));
  expect((await post(randomUUID())).status).toBe(500); spy.mockRestore();
  expect(await Denuncia.count()).toBe(count);
  expect((await post('invalid')).status).toBe(400);
  expect((await post(randomUUID(), { ...payload, descricao: '' })).status).toBe(400);
});
test('denúncia removida mantém comprovante e não é recriada por repetição', async () => {
  const key = randomUUID(); const first = await post(key);
  await Denuncia.destroy({ where: { id: first.body.denuncia.id } });
  expect((await post(key)).status).toBe(410);
});
