const NEW_PERMISSIONS = [
  {
    key: 'denuncia.audit.view',
    description: 'Consultar a trilha de auditoria das denúncias.'
  },
  {
    key: 'users.audit.view',
    description: 'Consultar a trilha administrativa de perfis dos usuários.'
  }
]

async function loadPermissions(queryInterface, Sequelize, transaction) {
  return queryInterface.sequelize.query(
    'SELECT "id", "key" FROM "Permissions"',
    { type: Sequelize.QueryTypes.SELECT, transaction }
  )
}

async function loadRoles(queryInterface, Sequelize, transaction) {
  return queryInterface.sequelize.query(
    'SELECT "id", "name" FROM "Roles"',
    { type: Sequelize.QueryTypes.SELECT, transaction }
  )
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      const now = new Date()
      let permissions = await loadPermissions(queryInterface, Sequelize, transaction)
      const existingKeys = new Set(permissions.map(permission => permission.key))
      const missingPermissions = NEW_PERMISSIONS
        .filter(permission => !existingKeys.has(permission.key))
        .map(permission => ({ ...permission, createdAt: now, updatedAt: now }))

      if (missingPermissions.length) {
        await queryInterface.bulkInsert('Permissions', missingPermissions, { transaction })
        permissions = await loadPermissions(queryInterface, Sequelize, transaction)
      }

      const roles = await loadRoles(queryInterface, Sequelize, transaction)
      const roleIdByName = Object.fromEntries(roles.map(role => [role.name, role.id]))
      const permissionIdByKey = Object.fromEntries(permissions.map(permission => [permission.key, permission.id]))
      const assignments = [
        ['MODERATOR', 'denuncia.audit.view'],
        ['ADMIN', 'denuncia.audit.view'],
        ['ADMIN', 'users.audit.view']
      ]
        .filter(([roleName, permissionKey]) => roleIdByName[roleName] && permissionIdByKey[permissionKey])
        .map(([roleName, permissionKey]) => ({
          roleId: roleIdByName[roleName],
          permissionId: permissionIdByKey[permissionKey],
          createdAt: now,
          updatedAt: now
        }))

      const existingAssignments = await queryInterface.sequelize.query(
        'SELECT "roleId", "permissionId" FROM "RolePermissions"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      const existingAssignmentKeys = new Set(
        existingAssignments.map(item => `${item.roleId}:${item.permissionId}`)
      )
      const missingAssignments = assignments.filter(
        item => !existingAssignmentKeys.has(`${item.roleId}:${item.permissionId}`)
      )
      if (missingAssignments.length) {
        await queryInterface.bulkInsert('RolePermissions', missingAssignments, { transaction })
      }

      const legacyPermission = permissions.find(permission => permission.key === 'audit.view')
      if (legacyPermission) {
        await queryInterface.bulkDelete('RolePermissions', { permissionId: legacyPermission.id }, { transaction })
        await queryInterface.bulkDelete('Permissions', { id: legacyPermission.id }, { transaction })
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      const now = new Date()
      let permissions = await loadPermissions(queryInterface, Sequelize, transaction)
      let legacyPermission = permissions.find(permission => permission.key === 'audit.view')

      if (!legacyPermission) {
        await queryInterface.bulkInsert('Permissions', [{
          key: 'audit.view',
          description: 'Consultar a trilha de auditoria.',
          createdAt: now,
          updatedAt: now
        }], { transaction })
        permissions = await loadPermissions(queryInterface, Sequelize, transaction)
        legacyPermission = permissions.find(permission => permission.key === 'audit.view')
      }

      const roles = await loadRoles(queryInterface, Sequelize, transaction)
      const adminRole = roles.find(role => role.name === 'ADMIN')
      if (adminRole && legacyPermission) {
        const [existingAssignment] = await queryInterface.sequelize.query(
          'SELECT "roleId" FROM "RolePermissions" WHERE "roleId" = :roleId AND "permissionId" = :permissionId',
          {
            replacements: { roleId: adminRole.id, permissionId: legacyPermission.id },
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        )
        if (!existingAssignment) {
          await queryInterface.bulkInsert('RolePermissions', [{
            roleId: adminRole.id,
            permissionId: legacyPermission.id,
            createdAt: now,
            updatedAt: now
          }], { transaction })
        }
      }

      const splitPermissionIds = permissions
        .filter(permission => NEW_PERMISSIONS.some(item => item.key === permission.key))
        .map(permission => permission.id)
      if (splitPermissionIds.length) {
        await queryInterface.bulkDelete('RolePermissions', {
          permissionId: { [Sequelize.Op.in]: splitPermissionIds }
        }, { transaction })
        await queryInterface.bulkDelete('Permissions', {
          id: { [Sequelize.Op.in]: splitPermissionIds }
        }, { transaction })
      }
    })
  }
}
