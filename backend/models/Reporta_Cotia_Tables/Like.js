const sequelize = require('../db/db')

const Like = sequelize.define('Like', {
}, {
  timestamps: true
})

module.exports = Like