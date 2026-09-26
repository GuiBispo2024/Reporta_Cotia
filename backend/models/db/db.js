const { Sequelize } = require('sequelize');
const { databaseConfig } = require('../../config/database');
const options = databaseConfig();
const sequelize = process.env.DATABASE_URL && process.env.NODE_ENV !== 'test'
  ? new Sequelize(process.env.DATABASE_URL, options)
  : new Sequelize(options);
module.exports = { sequelize, Sequelize };
