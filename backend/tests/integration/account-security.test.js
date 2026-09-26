const request = require('supertest');
const app = require('../../app');
const { sequelize, User } = require('../../models/rel');
const UserService = require('../../services/UserService');

beforeAll(() => sequelize.sync({ force: true }));
afterAll(() => sequelize.close());

test.each([
  { username: '', email: 'valid@example.com', password: '123456' },
  { username: 'valid', email: 'invalid', password: '123456' },
  { username: 'valid', email: 'valid@example.com', password: 'x' }
])('rejects invalid registration without persistence: %j', async payload => {
  const before = await User.count();
  expect((await request(app).post('/users').send(payload)).status).toBe(400);
  expect(await User.count()).toBe(before);
});

test('normalizes registration and revokes the previous session on password change', async () => {
  const user = await UserService.register({ username: ' Session ', email: ' SESSION@example.com ', password: '123456' });
  expect(user.email).toBe('session@example.com');
  const session = await UserService.login({ email: user.email, password: '123456' });
  const changed = await UserService.update({ senhaAtual: '123456', novaSenha: '654321' }, user.id);
  expect((await request(app).get('/users/me').auth(session.token, { type: 'bearer' })).status).toBe(401);
  expect((await request(app).get('/users/me').auth(changed.token, { type: 'bearer' })).status).toBe(200);
});
