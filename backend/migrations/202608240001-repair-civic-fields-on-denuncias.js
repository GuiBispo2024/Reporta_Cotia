module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Denuncia');

    const missingColumns = [
      ['categoria', {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: 'Outros'
      }],
      ['latitude', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true
      }],
      ['longitude', {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: true
      }],
      ['imageUrl', {
        type: Sequelize.STRING(1000),
        allowNull: true
      }],
      ['resolucaoStatus', {
        type: Sequelize.ENUM('aberta', 'em_andamento', 'resolvida'),
        allowNull: false,
        defaultValue: 'aberta'
      }],
      ['resolucaoAtualizadaEm', {
        type: Sequelize.DATE,
        allowNull: true
      }]
    ];

    for (const [column, definition] of missingColumns) {
      if (!table[column]) {
        await queryInterface.addColumn('Denuncia', column, definition);
      }
    }
  },

  async down() {
    // Migration reparadora: o rollback não remove colunas que podem ter sido
    // criadas pela migration original, evitando perda acidental de dados.
  }
};
