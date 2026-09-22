const { sequelize } = require('../db/db');
const { DataTypes } = require('sequelize');

module.exports = sequelize.define('BoardExportHistory', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  format: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'xlsx'
  },
  filters: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  recordCount: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'BoardExportHistories'
});
