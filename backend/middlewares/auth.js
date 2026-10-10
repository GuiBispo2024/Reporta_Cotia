const { extractUserAccess } = require('../utils/userAccess')
const SessionService = require('../services/SessionService')

module.exports = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Você precisa entrar na sua conta para continuar.', code: 'AUTH_REQUIRED' })
  }
  try {
    const { decoded, user, session: authSession } = await SessionService.validateAccess(token)
    req.authSession = authSession
    res.set?.('Cache-Control', 'no-store')
    if (!user || Number(decoded.v || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Esta sessão foi encerrada. Entre novamente.', code: 'SESSION_REVOKED' })
    }
    const { roles, permissions } = extractUserAccess(user)
    const { adm: _legacyAdm, ...session } = decoded
    req.user = { ...session, roles, permissions }
    next()
  } catch (error) {
    if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) return next(error)
    return res.status(401).json({ message: 'Sua sessão expirou. Entre novamente para continuar.', code: 'SESSION_EXPIRED' })
  }
}
