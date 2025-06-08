const db = require('./db')
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
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