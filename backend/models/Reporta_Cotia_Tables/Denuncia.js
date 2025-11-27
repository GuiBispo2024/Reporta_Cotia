const {sequelize} = require('../db/db')
const {DataTypes} = require('sequelize')

const Denuncia = sequelize.define('Denuncia',{
    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    localizacao: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descricao: {
        type: DataTypes.STRING,
        allowNull: false
    },    
    status:{
        type: DataTypes.ENUM('pendente', 'aprovada', 'rejeitada'),
        defaultValue: 'pendente'
    }
})

module.exports = Denuncia