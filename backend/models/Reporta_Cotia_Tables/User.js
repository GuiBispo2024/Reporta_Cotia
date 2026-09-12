const {sequelize} = require('../db/db')
const {DataTypes} = require('sequelize')

const User = sequelize.define('User',{
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatarUrl: {
        type: DataTypes.STRING(1000),
        allowNull: true
    },
    tokenVersion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
})

module.exports = User
