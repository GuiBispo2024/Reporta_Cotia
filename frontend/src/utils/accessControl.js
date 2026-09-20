export const PERMISSIONS = Object.freeze({
  MODERATION_VIEW: 'moderation.view',
  MODERATION_REVIEW: 'moderation.review',
  CENSORSHIP_REVIEW: 'censorship.review',
  RESOLUTION_UPDATE: 'resolution.update',
  DASHBOARD_PUBLIC_VIEW: 'dashboard.public.view',
  DASHBOARD_FULL_VIEW: 'dashboard.full.view',
  USERS_VIEW: 'users.view',
  USERS_MANAGE_ROLES: 'users.manage_roles',
  DENUNCIA_AUDIT_VIEW: 'denuncia.audit.view',
  USERS_AUDIT_VIEW: 'users.audit.view'
})

const ROLE_LABELS = Object.freeze({
  ADMIN: 'Administrador',
  MODERATOR: 'Moderador',
  ANALYST: 'Analista',
  CITIZEN: 'Cidadão'
})

export function hasPermission(user, permission) {
  if (!user) return false
  return Boolean(user.permissions?.includes(permission))
}

export function getPrimaryRole(user) {
  const roles = (user?.roles || []).map(role => typeof role === 'string' ? role : role.name)
  return ['ADMIN', 'MODERATOR', 'ANALYST', 'CITIZEN'].find(role => roles.includes(role)) || 'CITIZEN'
}

export function getPrimaryRoleLabel(user) {
  return ROLE_LABELS[getPrimaryRole(user)]
}
