'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Denuncia');
    if (!table.bairro) {
      await queryInterface.addColumn('Denuncia', 'bairro', {
        type: Sequelize.STRING(120),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Denuncia');
    if (table.bairro) await queryInterface.removeColumn('Denuncia', 'bairro');
  }
};
