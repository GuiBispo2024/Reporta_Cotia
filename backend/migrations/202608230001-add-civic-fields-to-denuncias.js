module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Denuncia');

    if (!table.categoria) {
      await queryInterface.addColumn('Denuncia', 'categoria', {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: 'Outros'
      });
    }
    if (!table.latitude) {
      await queryInterface.addColumn('Denuncia', 'latitude', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true
      });
    }
    if (!table.longitude) {
      await queryInterface.addColumn('Denuncia', 'longitude', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true
      });
    }
    if (!table.imageUrl) {
      await queryInterface.addColumn('Denuncia', 'imageUrl', {
        type: Sequelize.STRING(1000),
        allowNull: true
      });
    }
    if (!table.resolucaoStatus) {
      await queryInterface.addColumn('Denuncia', 'resolucaoStatus', {
        type: Sequelize.ENUM('aberta', 'em_andamento', 'resolvida'),
        allowNull: false,
        defaultValue: 'aberta'
      });
    }
    if (!table.resolucaoAtualizadaEm) {
      await queryInterface.addColumn('Denuncia', 'resolucaoAtualizadaEm', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Denuncia');
    for (const column of ['resolucaoAtualizadaEm', 'resolucaoStatus', 'imageUrl', 'longitude', 'latitude', 'categoria']) {
      if (table[column]) await queryInterface.removeColumn('Denuncia', column);
    }
  }
};
