'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('BoardExportHistories', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        format: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'xlsx' },
        filters: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
        recordCount: { type: Sequelize.INTEGER, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      }, { transaction });
      await queryInterface.addIndex('BoardExportHistories', ['userId', 'createdAt'], {
        name: 'board_export_histories_user_created_at',
        transaction
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable('BoardExportHistories', { transaction });
    });
  }
};
