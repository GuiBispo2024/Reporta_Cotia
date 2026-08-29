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
    adm: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    avatarUrl: {
        type: DataTypes.STRING(1000),
        allowNull: true
    }
})

module.exports = User
