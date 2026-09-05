'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Denuncia');
    if (!table.setorResponsavel) {
      await queryInterface.addColumn('Denuncia', 'setorResponsavel', {
        type: Sequelize.STRING(120),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Denuncia');
    if (table.setorResponsavel) {
      await queryInterface.removeColumn('Denuncia', 'setorResponsavel');
    }
  }
};
