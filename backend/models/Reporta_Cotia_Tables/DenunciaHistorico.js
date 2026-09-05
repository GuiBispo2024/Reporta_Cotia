const { sequelize } = require('../db/db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define('DenunciaHistorico', {
  tipo: { type: DataTypes.ENUM('moderacao', 'resolucao'), allowNull: false },
  statusAnterior: { type: DataTypes.STRING(40), allowNull: true },
  statusNovo: { type: DataTypes.STRING(40), allowNull: false },
  motivo: { type: DataTypes.STRING(1000), allowNull: true },
  responsavel: { type: DataTypes.STRING(120), allowNull: true }
})
