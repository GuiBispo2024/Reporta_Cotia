const ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  MODERATOR: 'MODERATOR',
  ANALYST: 'ANALYST',
  ADMIN: 'ADMIN'
})

const PERMISSIONS = Object.freeze({
  DENUNCIA_CREATE: 'denuncia.create',
  DENUNCIA_UPDATE_OWN: 'denuncia.update_own',
  DENUNCIA_DELETE_OWN: 'denuncia.delete_own',
  MODERATION_VIEW: 'moderation.view',
  MODERATION_REVIEW: 'moderation.review',
  CENSORSHIP_REVIEW: 'censorship.review',
  RESOLUTION_UPDATE: 'resolution.update',
  DASHBOARD_PUBLIC_VIEW: 'dashboard.public.view',
  DASHBOARD_FULL_VIEW: 'dashboard.full.view',
  DASHBOARD_EXPORT: 'dashboard.export',
  USERS_VIEW: 'users.view',
  USERS_MANAGE_ROLES: 'users.manage_roles',
  AUDIT_VIEW: 'audit.view'
})

module.exports = { ROLES, PERMISSIONS }
