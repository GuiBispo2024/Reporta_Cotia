const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db');
module.exports = sequelize.define('SessionRefreshToken', {
  tokenHash: { type: DataTypes.STRING(64), primaryKey: true, allowNull: false },
  sessionId: { type: DataTypes.UUID, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true }
});
