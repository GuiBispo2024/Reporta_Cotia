const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db');

module.exports = sequelize.define('PasswordResetHistorico', {
  email: { type: DataTypes.STRING, allowNull: false },
  evento: { type: DataTypes.STRING(40), allowNull: false },
  sucesso: { type: DataTypes.BOOLEAN, allowNull: false },
  ip: { type: DataTypes.STRING(64), allowNull: true },
  userAgent: { type: DataTypes.STRING(500), allowNull: true },
  detalhes: { type: DataTypes.STRING(255), allowNull: true }
});
