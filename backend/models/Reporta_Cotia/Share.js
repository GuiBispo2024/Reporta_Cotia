const sequelize = require('../db/db')
const {DataTypes} = require('sequelize')

const Share = sequelize.define('Share', {
  comentario: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
})

module.exports = Share