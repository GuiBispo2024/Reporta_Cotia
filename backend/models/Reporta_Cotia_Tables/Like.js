const sequelize = require('../db/db')
const {DataTypes} = require('sequelize')

const Like = sequelize.define('Like', {
}, {
  timestamps: true
})

module.exports = Like