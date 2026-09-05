const jwt = require('jsonwebtoken')
const { User } = require('../models/rel')
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'reporta-cotia-test-secret' : undefined)

module.exports = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Você precisa entrar na sua conta para continuar.', code: 'AUTH_REQUIRED' })
  }
  try {
    const decoded = jwt.verify(token, SECRET)
    const user = await User.findByPk(decoded.id, { attributes: ['id', 'adm', 'tokenVersion'] })
    if (!user || Number(decoded.v || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Esta sessão foi encerrada. Entre novamente.', code: 'SESSION_REVOKED' })
    }
    req.user = { ...decoded, adm: user.adm }
    next()
  } catch {
    return res.status(401).json({ message: 'Sua sessão expirou. Entre novamente para continuar.', code: 'SESSION_EXPIRED' })
  }
}
