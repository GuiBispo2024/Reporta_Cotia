const request = require('supertest');
const app = require('../../app');
const { sequelize } = require('../../models/rel');
afterAll(() => sequelize.close());
test.each(['abc', '-1', '1.5', '1x', '0', '9007199254740993'])('rejects invalid page %s before querying the database', async page => {
  const response = await request(app).get(`/denuncia/public/user/1?page=${page}`);
  expect(response.status).toBe(400);
  expect(response.body.code).toBe('VALIDATION_ERROR');
});
