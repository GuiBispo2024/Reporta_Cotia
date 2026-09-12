module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      const roles = await queryInterface.sequelize.query(
        'SELECT "id", "name" FROM "Roles" WHERE "name" IN (\'ADMIN\', \'CITIZEN\')',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      const roleIdByName = Object.fromEntries(roles.map(role => [role.name, role.id]))

      if (!roleIdByName.ADMIN || !roleIdByName.CITIZEN) {
        throw new Error('Execute primeiro a migration de criação dos perfis de acesso.')
      }

      const legacyAdmins = await queryInterface.sequelize.query(
        'SELECT "id" FROM "Users" WHERE "adm" = true',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      const existingAssignments = await queryInterface.sequelize.query(
        'SELECT "userId", "roleId" FROM "UserRoles"',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      )
      const existingKeys = new Set(
        existingAssignments.map(assignment => `${assignment.userId}:${assignment.roleId}`)
      )
      const now = new Date()
      const assignments = legacyAdmins.flatMap(user =>
        [roleIdByName.CITIZEN, roleIdByName.ADMIN]
          .filter(roleId => !existingKeys.has(`${user.id}:${roleId}`))
          .map(roleId => ({ userId: user.id, roleId, createdAt: now, updatedAt: now }))
      )

      if (assignments.length) {
        await queryInterface.bulkInsert('UserRoles', assignments, { transaction })
      }
    })
  },

  // O backfill não é revertido para não remover perfis administrativos legítimos.
  async down() {}
}
