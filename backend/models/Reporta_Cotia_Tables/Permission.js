const { sequelize } = require('../db/db')
const { DataTypes } = require('sequelize')

const Permission = sequelize.define('Permission', {
  key: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'Permissions'
})

module.exports = Permission
