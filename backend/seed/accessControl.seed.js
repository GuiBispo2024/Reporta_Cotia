const { Role, Permission } = require('../models/rel')
const { ROLES, ROLE_DESCRIPTIONS, PERMISSIONS } = require('../constants/accessControl')

const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.DENUNCIA_CREATE]: 'Criar denúncias.',
  [PERMISSIONS.DENUNCIA_UPDATE_OWN]: 'Atualizar as próprias denúncias.',
  [PERMISSIONS.DENUNCIA_DELETE_OWN]: 'Excluir as próprias denúncias.',
  [PERMISSIONS.MODERATION_VIEW]: 'Visualizar a fila de moderação.',
  [PERMISSIONS.MODERATION_REVIEW]: 'Aprovar ou rejeitar denúncias.',
  [PERMISSIONS.CENSORSHIP_REVIEW]: 'Revisar conteúdos censurados.',
  [PERMISSIONS.RESOLUTION_UPDATE]: 'Atualizar o andamento de uma denúncia.',
  [PERMISSIONS.DASHBOARD_PUBLIC_VIEW]: 'Consultar indicadores públicos.',
  [PERMISSIONS.DASHBOARD_FULL_VIEW]: 'Consultar o dashboard analítico completo.',
  [PERMISSIONS.DASHBOARD_EXPORT]: 'Exportar relatórios analíticos.',
  [PERMISSIONS.USERS_VIEW]: 'Consultar a listagem administrativa de usuários.',
  [PERMISSIONS.USERS_MANAGE_ROLES]: 'Gerenciar perfis de acesso dos usuários.',
  [PERMISSIONS.AUDIT_VIEW]: 'Consultar a trilha de auditoria.'
}

const ROLE_PERMISSIONS = {
  [ROLES.CITIZEN]: [
    PERMISSIONS.DENUNCIA_CREATE,
    PERMISSIONS.DENUNCIA_UPDATE_OWN,
    PERMISSIONS.DENUNCIA_DELETE_OWN,
    PERMISSIONS.DASHBOARD_PUBLIC_VIEW
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.MODERATION_VIEW,
    PERMISSIONS.MODERATION_REVIEW,
    PERMISSIONS.CENSORSHIP_REVIEW,
    PERMISSIONS.RESOLUTION_UPDATE
  ],
  [ROLES.ANALYST]: [
    PERMISSIONS.DASHBOARD_FULL_VIEW,
    PERMISSIONS.DASHBOARD_EXPORT
  ],
  [ROLES.ADMIN]: Object.values(PERMISSIONS)
}

module.exports = async () => {
  console.log('Iniciando seed de perfis e permissões...')

  const permissionsByKey = {}
  for (const [key, description] of Object.entries(PERMISSION_DESCRIPTIONS)) {
    const [permission] = await Permission.findOrCreate({
      where: { key },
      defaults: { description }
    })
    permissionsByKey[key] = permission
  }

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const [role] = await Role.findOrCreate({
      where: { name: roleName },
      defaults: { description: ROLE_DESCRIPTIONS[roleName] }
    })
    await role.setPermissions(permissionKeys.map(key => permissionsByKey[key]))
  }

  console.log('Seed de perfis e permissões concluída.')
}
