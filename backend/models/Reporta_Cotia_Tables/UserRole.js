const { sequelize } = require('../db/db')
const { DataTypes } = require('sequelize')

const UserRole = sequelize.define('UserRole', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'UserRoles'
})

module.exports = UserRole
