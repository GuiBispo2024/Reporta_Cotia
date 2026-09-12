export const PERMISSIONS = Object.freeze({
  MODERATION_VIEW: 'moderation.view',
  MODERATION_REVIEW: 'moderation.review',
  CENSORSHIP_REVIEW: 'censorship.review',
  RESOLUTION_UPDATE: 'resolution.update',
  USERS_MANAGE_ROLES: 'users.manage_roles',
  AUDIT_VIEW: 'audit.view'
})

const ROLE_LABELS = Object.freeze({
  ADMIN: 'Administrador',
  MODERATOR: 'Moderador',
  ANALYST: 'Analista',
  CITIZEN: 'Cidadão'
})

export function hasPermission(user, permission) {
  if (!user) return false
  return Boolean(user.adm || user.permissions?.includes(permission))
}

export function getPrimaryRole(user) {
  if (user?.adm) return 'ADMIN'
  const roles = (user?.roles || []).map(role => typeof role === 'string' ? role : role.name)
  return ['ADMIN', 'MODERATOR', 'ANALYST', 'CITIZEN'].find(role => roles.includes(role)) || 'CITIZEN'
}

export function getPrimaryRoleLabel(user) {
  return ROLE_LABELS[getPrimaryRole(user)]
}
