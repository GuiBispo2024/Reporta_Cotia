const sequelize = require('../db/db')
const {DataTypes} = require('sequelize')

const User = sequelize.define('User',{
    username: {
        type: DataTypes.STRING,
        allowNull: false
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
    }
})

module.exports = User