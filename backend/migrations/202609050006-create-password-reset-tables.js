'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map(String).map(name => name.toLowerCase());
    if (!tables.includes('passwordresettokens')) {
      await queryInterface.createTable('PasswordResetTokens', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        expiresAt: { type: Sequelize.DATE, allowNull: false },
        usedAt: { type: Sequelize.DATE, allowNull: true },
        requestedIp: { type: Sequelize.STRING(64), allowNull: true },
        userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex('PasswordResetTokens', ['userId', 'expiresAt']);
    }
    if (!tables.includes('passwordresethistoricos')) {
      await queryInterface.createTable('PasswordResetHistoricos', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        email: { type: Sequelize.STRING, allowNull: false },
        evento: { type: Sequelize.STRING(40), allowNull: false },
        sucesso: { type: Sequelize.BOOLEAN, allowNull: false },
        ip: { type: Sequelize.STRING(64), allowNull: true },
        userAgent: { type: Sequelize.STRING(500), allowNull: true },
        detalhes: { type: Sequelize.STRING(255), allowNull: true },
        userId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL' },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex('PasswordResetHistoricos', ['createdAt']);
    }
  },
  async down(queryInterface) {
    await queryInterface.dropTable('PasswordResetHistoricos');
    await queryInterface.dropTable('PasswordResetTokens');
  }
};
