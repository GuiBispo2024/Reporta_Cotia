const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db');
module.exports = sequelize.define('AuthSession', {
  id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  tokenVersion: { type: DataTypes.INTEGER, allowNull: false },
  client: { type: DataTypes.STRING(10), allowNull: false },
  lastActivityAt: { type: DataTypes.DATE, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  revokedAt: { type: DataTypes.DATE, allowNull: true }
});
