module.exports = {
  async up(queryInterface, Sequelize) {
    const denuncia = await queryInterface.describeTable('Denuncia');
    const denunciaColumns = {
      tituloOriginal: { type: Sequelize.STRING(120), allowNull: true },
      descricaoOriginal: { type: Sequelize.STRING(2000), allowNull: true },
      tituloCensurado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      descricaoCensurada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      motivoRejeicao: { type: Sequelize.STRING(1000), allowNull: true }
    };
    for (const [name, definition] of Object.entries(denunciaColumns)) {
      if (!denuncia[name]) await queryInterface.addColumn('Denuncia', name, definition);
    }
    const comentario = await queryInterface.describeTable('Comentarios');
    const commentColumns = {
      comentarioOriginal: { type: Sequelize.STRING, allowNull: true },
      censurado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      censuraRevisada: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    };
    for (const [name, definition] of Object.entries(commentColumns)) {
      if (!comentario[name]) await queryInterface.addColumn('Comentarios', name, definition);
    }
  },
  async down(queryInterface) {
    const denuncia = await queryInterface.describeTable('Denuncia');
    for (const name of ['motivoRejeicao', 'descricaoCensurada', 'tituloCensurado', 'descricaoOriginal', 'tituloOriginal']) {
      if (denuncia[name]) await queryInterface.removeColumn('Denuncia', name);
    }
    const comentario = await queryInterface.describeTable('Comentarios');
    for (const name of ['censuraRevisada', 'censurado', 'comentarioOriginal']) {
      if (comentario[name]) await queryInterface.removeColumn('Comentarios', name);
    }
  }
};
