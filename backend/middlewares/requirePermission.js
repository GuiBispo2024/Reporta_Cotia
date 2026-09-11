module.exports = permission => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Você precisa entrar na sua conta para continuar.',
      code: 'AUTH_REQUIRED'
    })
  }

  const hasPermission = req.user.permissions?.includes(permission)

  // Compatibilidade temporária: administradores antigos continuam autorizados
  // enquanto as demais rotas ainda usam o campo legado adm.
  if (hasPermission || req.user.adm) return next()

  return res.status(403).json({
    message: 'Sua conta não possui permissão para realizar esta ação.',
    code: 'FORBIDDEN'
  })
}
