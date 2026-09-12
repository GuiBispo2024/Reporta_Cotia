import { getPrimaryRoleLabel, hasPermission, PERMISSIONS } from '../../src/utils/accessControl'

test('autoriza pela permissão recebida da sessão', () => {
  const moderator = { permissions: [PERMISSIONS.MODERATION_VIEW] }

  expect(hasPermission(moderator, PERMISSIONS.MODERATION_VIEW)).toBe(true)
  expect(hasPermission(moderator, PERMISSIONS.MODERATION_REVIEW)).toBe(false)
})

test('não autoriza um perfil sem a permissão exigida', () => {
  expect(hasPermission({ roles: ['ADMIN'], permissions: [] }, PERMISSIONS.AUDIT_VIEW)).toBe(false)
})

test('apresenta o perfil de maior responsabilidade', () => {
  expect(getPrimaryRoleLabel({ roles: ['CITIZEN', 'MODERATOR'] })).toBe('Moderador')
  expect(getPrimaryRoleLabel({ roles: ['CITIZEN', 'ANALYST'] })).toBe('Analista')
  expect(getPrimaryRoleLabel({ roles: ['CITIZEN'] })).toBe('Cidadão')
  expect(getPrimaryRoleLabel({ roles: ['CITIZEN', 'ADMIN'] })).toBe('Administrador')
})
