const {sequelize} = require('../db/db')
const {DataTypes} = require('sequelize')

const Share = sequelize.define('Share', {
  clientRequestId: { type: DataTypes.UUID, allowNull: true },
  comentario: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [{ name: 'shares_user_request_unique', unique: true, fields: ['userId', 'clientRequestId'] }]
})

module.exports = Share
