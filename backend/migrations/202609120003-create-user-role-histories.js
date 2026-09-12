module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('UserRoleHistories', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        targetUserId: { type: Sequelize.INTEGER, allowNull: false },
        targetUsername: { type: Sequelize.STRING(255), allowNull: false },
        changedByUserId: { type: Sequelize.INTEGER, allowNull: false },
        changedByUsername: { type: Sequelize.STRING(255), allowNull: false },
        previousRoles: { type: Sequelize.JSON, allowNull: false },
        newRoles: { type: Sequelize.JSON, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      }, { transaction })

      await queryInterface.addIndex('UserRoleHistories', ['targetUserId', 'createdAt'], {
        name: 'user_role_histories_target_created_at',
        transaction
      })
      await queryInterface.addIndex('UserRoleHistories', ['changedByUserId', 'createdAt'], {
        name: 'user_role_histories_actor_created_at',
        transaction
      })
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable('UserRoleHistories', { transaction })
    })
  }
}
