module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');
    if (!table.avatarUrl) {
      await queryInterface.addColumn('Users', 'avatarUrl', {
        type: Sequelize.STRING(1000),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');
    if (table.avatarUrl) await queryInterface.removeColumn('Users', 'avatarUrl');
  }
};
