'use strict';

module.exports = {
  async up(queryInterface) {
    let table = await queryInterface.describeTable('DenunciaHistoricos');
    if (table.nota && !table.motivo) {
      await queryInterface.renameColumn('DenunciaHistoricos', 'nota', 'motivo');
    }

    table = await queryInterface.describeTable('DenunciaHistoricos');
    if (table.evidenciaUrl) {
      await queryInterface.removeColumn('DenunciaHistoricos', 'evidenciaUrl');
    }
  },

  async down(queryInterface, Sequelize) {
    let table = await queryInterface.describeTable('DenunciaHistoricos');
    if (!table.evidenciaUrl) {
      await queryInterface.addColumn('DenunciaHistoricos', 'evidenciaUrl', {
        type: Sequelize.STRING(1000),
        allowNull: true
      });
    }

    table = await queryInterface.describeTable('DenunciaHistoricos');
    if (table.motivo && !table.nota) {
      await queryInterface.renameColumn('DenunciaHistoricos', 'motivo', 'nota');
    }
  }
};
