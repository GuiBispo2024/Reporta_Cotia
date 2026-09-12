module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn('Users', 'adm', { transaction })
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('Users', 'adm', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction })

      await queryInterface.sequelize.query(`
        UPDATE "Users"
        SET "adm" = true
        WHERE "id" IN (
          SELECT "UserRoles"."userId"
          FROM "UserRoles"
          INNER JOIN "Roles" ON "Roles"."id" = "UserRoles"."roleId"
          WHERE "Roles"."name" = 'ADMIN'
        )
      `, { transaction })
    })
  }
}
