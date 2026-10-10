const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const SessionService = require('../../services/SessionService');
const { sequelize, User, AuthSession, SessionRefreshToken } = require('../../models/rel');
let count = 0;
async function mobileLogin() {
  const email = `session-${++count}@example.org`;
  await request(app).post('/users').send({ username: `session-${count}`, email, password: 'secret123' });
  const result = await request(app).post('/users/login').send({ email, password: 'secret123' });
  expect(result.status).toBe(200); return result.body;
}
beforeAll(() => sequelize.sync({ force: true }));
afterAll(() => sequelize.close());
test('access token dura 5 minutos, refresh fica apenas como hash e possui sessão revogável', async () => {
  const login = await mobileLogin(), decoded = jwt.decode(login.token);
  expect(decoded.exp - decoded.iat).toBe(300);
  expect(decoded.sid).toBe(login.sessionId);
  const stored = await SessionRefreshToken.findOne({ where: { sessionId: login.sessionId } });
  expect(stored.tokenHash).not.toBe(login.refreshToken);
  expect((await request(app).get('/users/me').set('Authorization', `Bearer ${login.token}`)).status).toBe(200);
});
test('refresh rotaciona e reutilização do token anterior revoga a família inteira', async () => {
  const login = await mobileLogin();
  const first = await request(app).post('/users/session/refresh').send({ refreshToken: login.refreshToken });
  expect(first.status).toBe(200); expect(first.body.refreshToken).not.toBe(login.refreshToken);
  const replay = await request(app).post('/users/session/refresh').send({ refreshToken: login.refreshToken });
  expect(replay.status).toBe(401); expect(replay.body.code).toBe('REFRESH_REUSED');
  expect((await request(app).post('/users/session/refresh').send({ refreshToken: first.body.refreshToken })).status).toBe(401);
  expect((await request(app).get('/users/me').set('Authorization', `Bearer ${first.body.token}`)).status).toBe(401);
});
test('inatividade é imposta no servidor e não pode ser revertida por refresh ou heartbeat', async () => {
  const login = await mobileLogin();
  await AuthSession.update({ lastActivityAt: new Date(Date.now() - 15 * 60000) }, { where: { id: login.sessionId } });
  const access = await request(app).get('/users/me').set('Authorization', `Bearer ${login.token}`);
  expect(access.status).toBe(401); expect(access.body.code).toBe('INACTIVITY_TIMEOUT');
  expect((await request(app).post('/users/session/refresh').send({ refreshToken: login.refreshToken })).body.code).toBe('INACTIVITY_TIMEOUT');
  expect((await request(app).post('/users/session/activity').set('Authorization', `Bearer ${login.token}`)).status).toBe(401);
});
test('refresh e consultas automáticas não renovam inatividade; atividade explícita renova', async () => {
  const login = await mobileLogin();
  const before = Date.now() - 5 * 60000;
  await AuthSession.update({ lastActivityAt: new Date(before) }, { where: { id: login.sessionId } });
  const renewed = await request(app).post('/users/session/refresh').send({ refreshToken: login.refreshToken });
  await request(app).get('/users/me').set('Authorization', `Bearer ${renewed.body.token}`);
  expect(new Date((await AuthSession.findByPk(login.sessionId)).lastActivityAt).getTime()).toBe(before);
  await request(app).post('/users/session/activity').set('Authorization', `Bearer ${renewed.body.token}`).send({ idleForMs: 30000 });
  expect(new Date((await AuthSession.findByPk(login.sessionId)).lastActivityAt).getTime()).toBeGreaterThan(before);
  expect(new Date((await AuthSession.findByPk(login.sessionId)).lastActivityAt).getTime()).toBeLessThan(Date.now() - 29000);
});
test('logout, limite absoluto e troca de senha revogam credenciais de renovação', async () => {
  const login = await mobileLogin();
  await request(app).post('/users/session/end').send({ refreshToken: login.refreshToken });
  expect((await request(app).get('/users/me').set('Authorization', `Bearer ${login.token}`)).status).toBe(401);
  const absolute = await mobileLogin();
  await AuthSession.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: absolute.sessionId } });
  expect((await request(app).post('/users/session/refresh').send({ refreshToken: absolute.refreshToken })).status).toBe(401);
  const changed = await mobileLogin();
  await User.increment('tokenVersion', { where: { id: changed.user.id } });
  expect((await request(app).post('/users/session/refresh').send({ refreshToken: changed.refreshToken })).status).toBe(401);
});
test('web usa cookie HttpOnly SameSite e não expõe refresh no JSON; origem maliciosa é bloqueada', async () => {
  const email = `browser-${++count}@example.org`;
  await request(app).post('/users').send({ username: `browser-${count}`, email, password: 'secret123' });
  const login = await request(app).post('/users/login').set('Origin', 'http://localhost:3000').send({ email, password: 'secret123' });
  expect(login.status).toBe(200); expect(login.body.refreshToken).toBeUndefined();
  const cookie = login.headers['set-cookie'][0];
  expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Lax');
  expect((await request(app).post('/users/session/refresh').set('Origin', 'http://localhost:3000').set('Cookie', cookie)).status).toBe(200);
  expect((await request(app).post('/users/session/refresh').set('Origin', 'https://malicious.example').set('Cookie', cookie)).status).toBe(403);
  expect((await request(app).post('/users/session/refresh').set('X-Session-Client', 'web').set('Cookie', cookie)).status).toBe(403);
});
test('JWT legado sem sessão não é aceito após a migração', async () => {
  const login = await mobileLogin();
  const legacy = jwt.sign({ id: login.user.id, v: 0 }, process.env.JWT_SECRET || 'reporta-cotia-test-secret');
  expect((await request(app).get('/users/me').set('Authorization', `Bearer ${legacy}`)).status).toBe(401);
});
test('JWT de acesso expirado pode ser renovado se sessão e refresh continuam válidos', async () => {
  const login = await mobileLogin();
  const stale = jwt.sign({ ...jwt.decode(login.token), exp: Math.floor(Date.now() / 1000) - 1 }, process.env.JWT_SECRET || 'reporta-cotia-test-secret', { algorithm: 'HS256' });
  const expired = await request(app).get('/users/me').set('Authorization', `Bearer ${stale}`);
  expect(expired.status).toBe(401); expect(expired.body.code).toBe('SESSION_EXPIRED');
  const refreshed = await request(app).post('/users/session/refresh').send({ refreshToken: login.refreshToken });
  expect(refreshed.status).toBe(200);
  expect((await request(app).get('/users/me').set('Authorization', `Bearer ${refreshed.body.token}`)).status).toBe(200);
});
test('limpeza apaga famílias expiradas sem apagar sessões ainda válidas', async () => {
  const old = await mobileLogin(), active = await mobileLogin();
  await AuthSession.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: old.sessionId } });
  await SessionService.pruneExpired();
  expect(await AuthSession.findByPk(old.sessionId)).toBeNull();
  expect(await SessionRefreshToken.count({ where: { sessionId: old.sessionId } })).toBe(0);
  expect(await AuthSession.findByPk(active.sessionId)).not.toBeNull();
});
test('access token não pode gerar refresh por edição comum ou troca de e-mail sem senha', async () => {
  const login = await mobileLogin();
  const normal = await request(app).put('/users/update').set('Authorization', `Bearer ${login.token}`).send({ username: `edited-${count}` });
  expect(normal.status).toBe(200); expect(normal.body.token).toBeUndefined(); expect(normal.body.refreshToken).toBeUndefined();
  const changed = await request(app).put('/users/update').set('Authorization', `Bearer ${login.token}`).send({ email: `changed-${count}@example.org` });
  expect(changed.status).toBe(400); expect(changed.body.code).toBe('REAUTH_REQUIRED');
  expect((await request(app).get('/users/me').set('Authorization', `Bearer ${login.token}`)).status).toBe(200);
});
