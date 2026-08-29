const {DataTypes} = require('sequelize')
const {sequelize} = require('../db/db')

const Comentario = sequelize.define('Comentario', {
  comentario: {
    type: DataTypes.STRING,
    allowNull: false
  },
  comentarioOriginal: { type: DataTypes.STRING, allowNull: true },
  censurado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  censuraRevisada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
})

module.exports = Comentario
