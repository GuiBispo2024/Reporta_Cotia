'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Denuncia');
    if (!table.imageUrls) {
      await queryInterface.addColumn('Denuncia', 'imageUrls', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      });
    }
  },
  async down(queryInterface) {
    const table = await queryInterface.describeTable('Denuncia');
    if (table.imageUrls) await queryInterface.removeColumn('Denuncia', 'imageUrls');
  }
};
