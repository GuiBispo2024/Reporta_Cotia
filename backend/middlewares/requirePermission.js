const { hasPermission } = require('../utils/authorization')

module.exports = permission => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Você precisa entrar na sua conta para continuar.',
      code: 'AUTH_REQUIRED'
    })
  }

  // Compatibilidade temporária para administradores anteriores à migração.
  if (hasPermission(req.user, permission)) return next()

  return res.status(403).json({
    message: 'Sua conta não possui permissão para realizar esta ação.',
    code: 'FORBIDDEN'
  })
}
