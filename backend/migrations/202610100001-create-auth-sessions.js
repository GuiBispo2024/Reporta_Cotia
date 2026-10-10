'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AuthSessions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      userId: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      tokenVersion: { type: Sequelize.INTEGER, allowNull: false },
      client: { type: Sequelize.STRING(10), allowNull: false },
      lastActivityAt: { type: Sequelize.DATE, allowNull: false },
      expiresAt: { type: Sequelize.DATE, allowNull: false },
      revokedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false }, updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('AuthSessions', ['userId']);
    await queryInterface.addIndex('AuthSessions', ['expiresAt']);
    await queryInterface.createTable('SessionRefreshTokens', {
      tokenHash: { type: Sequelize.STRING(64), primaryKey: true, allowNull: false },
      sessionId: { type: Sequelize.UUID, allowNull: false, references: { model: 'AuthSessions', key: 'id' }, onDelete: 'CASCADE' },
      usedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false }, updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('SessionRefreshTokens', ['sessionId']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('SessionRefreshTokens');
    await queryInterface.dropTable('AuthSessions');
  }
};
