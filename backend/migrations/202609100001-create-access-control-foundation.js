const ROLE_DEFINITIONS = [
  { name: 'CITIZEN', description: 'Acessa os recursos destinados aos cidadãos.' },
  { name: 'MODERATOR', description: 'Analisa denúncias e revisa conteúdos.' },
  { name: 'ANALYST', description: 'Consulta indicadores e relatórios completos.' },
  { name: 'ADMIN', description: 'Gerencia usuários, acessos e configurações.' }
]

const PERMISSION_DEFINITIONS = [
  { key: 'denuncia.create', description: 'Criar denúncias.' },
  { key: 'denuncia.update_own', description: 'Atualizar as próprias denúncias.' },
  { key: 'denuncia.delete_own', description: 'Excluir as próprias denúncias.' },
  { key: 'moderation.view', description: 'Visualizar a fila de moderação.' },
  { key: 'moderation.review', description: 'Aprovar ou rejeitar denúncias.' },
  { key: 'censorship.review', description: 'Revisar conteúdos censurados.' },
  { key: 'resolution.update', description: 'Atualizar o andamento de uma denúncia.' },
  { key: 'dashboard.public.view', description: 'Consultar indicadores públicos.' },
  { key: 'dashboard.full.view', description: 'Consultar o dashboard analítico completo.' },
  { key: 'dashboard.export', description: 'Exportar relatórios analíticos.' },
  { key: 'users.view', description: 'Consultar a listagem administrativa de usuários.' },
  { key: 'users.manage_roles', description: 'Gerenciar perfis de acesso dos usuários.' },
  { key: 'audit.view', description: 'Consultar a trilha de auditoria.' }
]

const ROLE_PERMISSION_KEYS = {
  CITIZEN: [
    'denuncia.create',
    'denuncia.update_own',
    'denuncia.delete_own',
    'dashboard.public.view'
  ],
  MODERATOR: [
    'moderation.view',
    'moderation.review',
    'censorship.review',
    'resolution.update'
  ],
  ANALYST: [
    'dashboard.full.view',
    'dashboard.export'
  ],
  ADMIN: PERMISSION_DEFINITIONS.map(permission => permission.key)
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('Roles', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(40),
          allowNull: false,
          unique: true
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })

      await queryInterface.createTable('Permissions', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        key: {
          type: Sequelize.STRING(80),
          allowNull: false,
          unique: true
        },
        description: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })

      await queryInterface.createTable('UserRoles', {
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: { model: 'Roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })

      await queryInterface.createTable('RolePermissions', {
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: { model: 'Roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        permissionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: { model: 'Permissions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })

      const now = new Date()
      await queryInterface.bulkInsert(
        'Roles',
        ROLE_DEFINITIONS.map(role => ({ ...role, createdAt: now, updatedAt: now })),
        { transaction }
      )
      await queryInterface.bulkInsert(
        'Permissions',
        PERMISSION_DEFINITIONS.map(permission => ({ ...permission, createdAt: now, updatedAt: now })),
        { transaction }
      )

      const roles = await queryInterface.sequelize.query(
        'SELECT "id", "name" FROM "Roles"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      const permissions = await queryInterface.sequelize.query(
        'SELECT "id", "key" FROM "Permissions"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      const roleIdByName = Object.fromEntries(roles.map(role => [role.name, role.id]))
      const permissionIdByKey = Object.fromEntries(permissions.map(permission => [permission.key, permission.id]))

      const rolePermissions = Object.entries(ROLE_PERMISSION_KEYS).flatMap(([roleName, keys]) =>
        keys.map(key => ({
          roleId: roleIdByName[roleName],
          permissionId: permissionIdByKey[key],
          createdAt: now,
          updatedAt: now
        }))
      )
      await queryInterface.bulkInsert('RolePermissions', rolePermissions, { transaction })

      const users = await queryInterface.sequelize.query(
        'SELECT "id", "adm" FROM "Users"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      const userRoles = users.flatMap(user => {
        const assignments = [{
          userId: user.id,
          roleId: roleIdByName.CITIZEN,
          createdAt: now,
          updatedAt: now
        }]
        if (user.adm) {
          assignments.push({
            userId: user.id,
            roleId: roleIdByName.ADMIN,
            createdAt: now,
            updatedAt: now
          })
        }
        return assignments
      })

      if (userRoles.length) {
        await queryInterface.bulkInsert('UserRoles', userRoles, { transaction })
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable('RolePermissions', { transaction })
      await queryInterface.dropTable('UserRoles', { transaction })
      await queryInterface.dropTable('Permissions', { transaction })
      await queryInterface.dropTable('Roles', { transaction })
    })
  }
}
