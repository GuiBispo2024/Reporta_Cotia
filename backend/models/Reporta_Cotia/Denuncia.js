const sequelize = require('../db/db')
const {DataTypes} = require('sequelize')

const Denuncia = sequelize.define('Denuncia',{
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descricao: {
        type: DataTypes.STRING,
        allowNull:false
    }
})

module.exports = Denuncia