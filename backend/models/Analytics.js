const { DataTypes } = require('sequelize');
const { sequelize } = require('./db/db');
const schema = require('../analytics/schema')(DataTypes);

module.exports = Object.fromEntries(Object.entries(schema).map(([tableName, attributes]) => [
  tableName, sequelize.define(tableName, attributes, { tableName })
]));
