const {sequelize} = require('../db/db')

const Like = sequelize.define('Like', {
}, {
  timestamps: true,
  indexes: [{ name: 'likes_user_report_unique', unique: true, fields: ['userId', 'denunciaId'] }]
})

module.exports = Like