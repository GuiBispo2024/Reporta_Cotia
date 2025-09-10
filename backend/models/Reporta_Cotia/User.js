const sequelize = require('../db/db')
const {DataTypes} = require('sequelize')

const User = sequelize.define('User',{
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false 
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

/*const UserSchema = new Schema({
    username: {
        type: String,
        required : true,
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    denuncias: [{
        titulo:{
            type: String,
            required: true
        },
        descricao:{
            type: String,
            required: true
        }
    }]
}, {collection:'User'})

const User = mongoose.model("User",UserSchema)

module.exports = User
*/