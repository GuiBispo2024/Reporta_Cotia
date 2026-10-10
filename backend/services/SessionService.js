const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, AuthSession, SessionRefreshToken } = require('../models/rel');
const UserRepository = require('../repositories/UserRepository');
const AppError = require('../utils/AppError');
const IDLE_MS = 15 * 60 * 1000;
const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const ACCESS_SECONDS = 5 * 60;
const secret = () => {
  const value = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : '');
  if (process.env.NODE_ENV !== 'test' && value.length < 32) throw new Error('Configure JWT_SECRET com ao menos 32 caracteres aleatórios.');
  return value;
};
const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const expired = (code = 'SESSION_EXPIRED') => new AppError('Sua sessão expirou. Entre novamente.', 401, code);

function assertActive(session, user, now = Date.now()) {
  if (!session || !user || session.revokedAt || Number(session.tokenVersion) !== Number(user.tokenVersion || 0)) throw expired('SESSION_REVOKED');
  if (new Date(session.expiresAt).getTime() <= now) throw expired();
  if (new Date(session.lastActivityAt).getTime() + IDLE_MS <= now) throw expired('INACTIVITY_TIMEOUT');
}
function response(session, refreshToken) {
  const token = jwt.sign({ id: session.userId, v: session.tokenVersion, sid: session.id, typ: 'access' }, secret(), {
    algorithm: 'HS256', expiresIn: ACCESS_SECONDS, issuer: 'reporta-cotia', audience: 'reporta-cotia-clients'
  });
  return { token, ...(refreshToken ? { refreshToken } : {}), sessionId: session.id,
    expiresAt: new Date(jwt.decode(token).exp * 1000).toISOString(),
    idleExpiresAt: new Date(new Date(session.lastActivityAt).getTime() + IDLE_MS).toISOString(),
    sessionExpiresAt: new Date(session.expiresAt).toISOString() };
}
class SessionService {
  static async create(user, client = 'mobile') {
    return sequelize.transaction(async (transaction) => {
      const session = await AuthSession.create({ id: crypto.randomUUID(), userId: user.id,
        tokenVersion: user.tokenVersion || 0, client, lastActivityAt: new Date(), expiresAt: new Date(Date.now() + ABSOLUTE_MS) }, { transaction });
      const token = crypto.randomBytes(32).toString('hex');
      await SessionRefreshToken.create({ tokenHash: hash(token), sessionId: session.id }, { transaction });
      return response(session, token);
    });
  }
  static async validateAccess(token) {
    const decoded = jwt.verify(token, secret(), { algorithms: ['HS256'], issuer: 'reporta-cotia', audience: 'reporta-cotia-clients' });
    if (typeof decoded.sid !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(decoded.sid) || decoded.typ !== 'access' || !Number.isSafeInteger(decoded.id)) throw expired();
    const user = await UserRepository.findByIdWithAccess(decoded.id, ['id', 'tokenVersion']);
    const session = await AuthSession.findByPk(decoded.sid);
    assertActive(session, user);
    if (Number(session.userId) !== Number(decoded.id) || Number(decoded.v) !== Number(user.tokenVersion || 0)) throw expired('SESSION_REVOKED');
    return { decoded, user, session };
  }
  static async refresh(token, client) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw expired();
    const found = await SessionRefreshToken.findByPk(hash(token));
    if (!found) throw expired();
    const result = await sequelize.transaction(async (transaction) => {
      const session = await AuthSession.findByPk(found.sessionId, { transaction, lock: transaction.LOCK.UPDATE });
      const stored = await SessionRefreshToken.findByPk(hash(token), { transaction });
      const user = session && await UserRepository.findByIdWithAccess(session.userId, ['id', 'tokenVersion']);
      if (!session || !stored || session.client !== client) return { error: expired() };
      if (stored.usedAt) {
        await session.update({ revokedAt: new Date() }, { transaction });
        return { error: expired('REFRESH_REUSED') };
      }
      try { assertActive(session, user); } catch (error) { return { error }; }
      await stored.update({ usedAt: new Date() }, { transaction });
      const next = crypto.randomBytes(32).toString('hex');
      await SessionRefreshToken.create({ tokenHash: hash(next), sessionId: session.id }, { transaction });
      // Renovação de credenciais NÃO renova o prazo de inatividade.
      return { ...response(session, next), userId: session.userId };
    });
    if (result.error) throw result.error;
    return result;
  }
  static async activity(sessionId, userId, idleForMs = 0) {
    return sequelize.transaction(async (transaction) => {
      const session = await AuthSession.findByPk(sessionId, { transaction, lock: transaction.LOCK.UPDATE });
      const user = await UserRepository.findByIdWithAccess(userId, ['id', 'tokenVersion']);
      assertActive(session, user);
      if (!Number.isFinite(idleForMs) || idleForMs < 0 || idleForMs >= IDLE_MS) throw new AppError('Atividade inválida.', 400, 'VALIDATION_ERROR');
      if (Number(session.userId) !== Number(userId)) throw expired();
      const activityAt = Math.max(new Date(session.lastActivityAt).getTime(), Date.now() - idleForMs);
      await session.update({ lastActivityAt: new Date(activityAt) }, { transaction });
      return { idleExpiresAt: new Date(activityAt + IDLE_MS).toISOString(), sessionExpiresAt: new Date(session.expiresAt).toISOString() };
    });
  }
  static async revoke(sessionId) {
    if (sessionId) await AuthSession.update({ revokedAt: new Date() }, { where: { id: sessionId } });
  }
  static async end(token, client) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return;
    const found = await SessionRefreshToken.findByPk(hash(token));
    if (!found) return;
    await AuthSession.update({ revokedAt: new Date() }, { where: { id: found.sessionId, client } });
  }
  static async pruneExpired() {
    return AuthSession.destroy({ where: { expiresAt: { [Op.lte]: new Date() } } });
  }
}
module.exports = SessionService;
