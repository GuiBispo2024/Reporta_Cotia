module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables()
    if (tables.map(String).some(name => name.toLowerCase() === 'denunciahistoricos')) return
    await queryInterface.createTable('DenunciaHistoricos', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      tipo: { type: Sequelize.ENUM('moderacao', 'resolucao'), allowNull: false },
      statusAnterior: { type: Sequelize.STRING(40), allowNull: true },
      statusNovo: { type: Sequelize.STRING(40), allowNull: false },
      nota: { type: Sequelize.STRING(1000), allowNull: true },
      responsavel: { type: Sequelize.STRING(120), allowNull: true },
      evidenciaUrl: { type: Sequelize.STRING(1000), allowNull: true },
      denunciaId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Denuncia', key: 'id' }, onDelete: 'CASCADE' },
      userId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('DenunciaHistoricos')
  }
}
