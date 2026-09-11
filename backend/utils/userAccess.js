function extractUserAccess(user) {
  const plain = user?.get ? user.get({ plain: true }) : user
  const roles = (plain?.roles || []).map(role => role.name)
  const permissions = [...new Set(
    (plain?.roles || []).flatMap(role =>
      (role.permissions || []).map(permission => permission.key)
    )
  )]

  return { roles, permissions }
}

module.exports = { extractUserAccess }
