const {DataTypes} = require('sequelize')
const {sequelize} = require('../db/db')

const Comentario = sequelize.define('Comentario', {
  comentario: {
    type: DataTypes.STRING,
    allowNull: false
  }
})

module.exports = Comentario