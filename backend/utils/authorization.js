function hasPermission(user, permission) {
  if (!user) return false
  return Boolean(user.adm || user.permissions?.includes(permission))
}

module.exports = { hasPermission }
