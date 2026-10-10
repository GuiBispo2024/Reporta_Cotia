'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ReportSubmissions', {
      userId: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      key: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      fingerprint: { type: Sequelize.STRING(64), allowNull: false },
      denunciaId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Denuncia', key: 'id' }, onDelete: 'SET NULL' },
      response: { type: Sequelize.JSON, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false }, updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('ReportSubmissions', ['denunciaId']);
  },
  async down(queryInterface) { await queryInterface.dropTable('ReportSubmissions'); }
};
