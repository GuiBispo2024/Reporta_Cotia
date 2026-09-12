const { sequelize } = require('../db/db')
const { DataTypes } = require('sequelize')

module.exports = sequelize.define('UserRoleHistory', {
  targetUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  targetUsername: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  changedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  changedByUsername: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  previousRoles: {
    type: DataTypes.JSON,
    allowNull: false
  },
  newRoles: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  tableName: 'UserRoleHistories'
})
