'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Shares', 'clientRequestId', { type: Sequelize.UUID, allowNull: true });
    await queryInterface.addIndex('Shares', ['userId', 'clientRequestId'], { unique: true, name: 'shares_user_request_unique' });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('Shares', 'shares_user_request_unique');
    await queryInterface.removeColumn('Shares', 'clientRequestId');
  }
};
