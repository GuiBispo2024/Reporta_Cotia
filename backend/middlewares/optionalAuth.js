const jwt = require('jsonwebtoken')
const UserRepository = require('../repositories/UserRepository')
const { extractUserAccess } = require('../utils/userAccess')

module.exports = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) return next()
  try {
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : undefined)
    const decoded = jwt.verify(token, secret)
    const user = await UserRepository.findByIdWithAccess(decoded.id, ['id', 'tokenVersion'])
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
