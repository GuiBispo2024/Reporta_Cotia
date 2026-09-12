const { sequelize } = require('../db/db')
const { DataTypes } = require('sequelize')

const RolePermission = sequelize.define('RolePermission', {
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  permissionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  }
}, {
  tableName: 'RolePermissions'
})

module.exports = RolePermission
