const { sequelize } = require('../db/db')
const { DataTypes } = require('sequelize')

const Role = sequelize.define('Role', {
  name: {
    type: DataTypes.STRING(40),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'Roles'
})

module.exports = Role
