const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db');
module.exports = sequelize.define('ReportSubmission', {
  userId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  key: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
  fingerprint: { type: DataTypes.STRING(64), allowNull: false },
  denunciaId: { type: DataTypes.INTEGER, allowNull: true },
  response: { type: DataTypes.JSON, allowNull: false }
});
