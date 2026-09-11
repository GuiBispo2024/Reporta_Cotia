const ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  MODERATOR: 'MODERATOR',
  ANALYST: 'ANALYST',
  ADMIN: 'ADMIN'
})

const ROLE_DESCRIPTIONS = Object.freeze({
  [ROLES.CITIZEN]: 'Acessa os recursos destinados aos cidadãos.',
  [ROLES.MODERATOR]: 'Analisa denúncias e revisa conteúdos.',
  [ROLES.ANALYST]: 'Consulta indicadores e relatórios completos.',
  [ROLES.ADMIN]: 'Gerencia usuários, acessos e configurações.'
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

module.exports = { ROLES, ROLE_DESCRIPTIONS, PERMISSIONS }
