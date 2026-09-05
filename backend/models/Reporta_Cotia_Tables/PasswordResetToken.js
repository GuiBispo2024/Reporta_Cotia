const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db');

module.exports = sequelize.define('PasswordResetToken', {
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
  requestedIp: { type: DataTypes.STRING(64), allowNull: true }
});
