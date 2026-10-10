// Teste de integração local: cria e remove somente uma conta temporária própria.
require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const assert = require('node:assert/strict');
const { sequelize, User, AuthSession } = require('../models/rel');
async function main() {
  if (process.env.NODE_ENV !== 'development' || process.env.DATABASE_URL || !['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost') || sequelize.getDialect() !== 'postgres') throw new Error('Teste permitido somente com PostgreSQL local em development.');
  const email = `session-audit-${crypto.randomUUID()}@example.invalid`;
  const password = crypto.randomBytes(32).toString('hex');
  const base = `http://127.0.0.1:${process.env.PORT || 8081}`;
  let userId;
  const call = async (path, method = 'GET', body, headers = {}) => {
    const result = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = result.status === 204 ? {} : await result.json();
    return { status: result.status, data, cookie: result.headers.get('set-cookie') };
  };
  try {
    const signup = await call('/users', 'POST', { username: `audit-${crypto.randomUUID()}`, email, password });
    assert.equal(signup.status, 201); userId = signup.data.user.id;
    const first = await call('/users/login', 'POST', { email, password }); assert.equal(first.status, 200);
    const concurrent = await Promise.all([call('/users/session/refresh', 'POST', { refreshToken: first.data.refreshToken }), call('/users/session/refresh', 'POST', { refreshToken: first.data.refreshToken })]);
    assert.deepEqual(concurrent.map((item) => item.status).sort(), [200, 401]);
    const renewed = concurrent.find((item) => item.status === 200);
    assert.equal((await call('/users/me', 'GET', null, { Authorization: `Bearer ${renewed.data.token}` })).status, 401);
    const browserHeaders = { Origin: 'http://localhost:3000', 'X-Session-Client': 'web' };
    const browser = await call('/users/login', 'POST', { email, password }, browserHeaders);
    assert.equal(browser.status, 200); assert.equal(browser.data.refreshToken, undefined); assert.ok(browser.cookie.includes('HttpOnly'));
    const webRefresh = await call('/users/session/refresh', 'POST', {}, { ...browserHeaders, Cookie: browser.cookie }); assert.equal(webRefresh.status, 200);
    assert.equal((await call('/users/session/refresh', 'POST', {}, { Origin: 'https://evil.example.invalid', Cookie: webRefresh.cookie })).status, 403);
    assert.equal((await call('/users/session/end', 'POST', {}, { ...browserHeaders, Cookie: webRefresh.cookie })).status, 204);
    assert.equal((await call('/users/me', 'GET', null, { Authorization: `Bearer ${webRefresh.data.token}` })).status, 401);
    const idle = await call('/users/login', 'POST', { email, password }); assert.equal(idle.status, 200);
    await AuthSession.update({ lastActivityAt: new Date(Date.now() - 900001) }, { where: { id: idle.data.sessionId, userId } });
    const refused = await call('/users/me', 'GET', null, { Authorization: `Bearer ${idle.data.token}` });
    assert.equal(refused.status, 401); assert.equal(refused.data.code, 'INACTIVITY_TIMEOUT');
    console.log('PostgreSQL local: rotação concorrente, cookies, CSRF, revogação e inatividade aprovados.');
  } finally {
    if (userId) await User.destroy({ where: { id: userId, email } });
    await sequelize.close();
  }
}
main().catch(() => { console.error('Falha no teste local de sessões. Nenhuma credencial foi registrada.'); process.exitCode = 1; });
