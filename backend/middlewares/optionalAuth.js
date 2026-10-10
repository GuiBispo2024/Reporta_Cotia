const { extractUserAccess } = require('../utils/userAccess')
const SessionService = require('../services/SessionService')

module.exports = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) return next()
  try {
    const { decoded, user, session } = await SessionService.validateAccess(token)
    req.authSession = session
    res.set('Cache-Control', 'no-store')
    if (user && Number(decoded.v || 0) === Number(user.tokenVersion || 0)) {
      const { roles, permissions } = extractUserAccess(user)
      const { adm: _legacyAdm, ...session } = decoded
      req.user = { ...session, roles, permissions }
    }
  } catch {
    // A rota continua pública quando o token opcional é inválido.
  }
  next()
}
