const jwt = require('jsonwebtoken')
const { User } = require('../models/rel')

module.exports = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) return next()
  try {
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : undefined)
    const decoded = jwt.verify(token, secret)
    const user = await User.findByPk(decoded.id, { attributes: ['id', 'adm', 'tokenVersion'] })
    if (user && Number(decoded.v || 0) === Number(user.tokenVersion || 0)) req.user = { ...decoded, adm: user.adm }
  } catch {
    // A rota continua pública quando o token opcional é inválido.
  }
  next()
}
