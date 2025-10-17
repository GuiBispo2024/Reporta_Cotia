const sequelize = require('./db/db')
const User = require('./Reporta_Cotia_Tables/User')
const Denuncia = require('./Reporta_Cotia_Tables/Denuncia')
const Comment = require('./Reporta_Cotia_Tables/Comment')
const Like = require('./Reporta_Cotia_Tables/Like')
const Share = require('./Reporta_Cotia_Tables/Share') 

//User <-> Denuncia
User.hasMany(Denuncia,{
   foreignKey: 'userId',
   onDelete: 'CASCADE'
})
Denuncia.belongsTo(User,{
    foreignKey: 'userId'
})

//User <-> Comentário
User.hasMany(Comment,{
    foreignKey: 'userId',
    onDelete: 'CASCADE'
})
Comment.belongsTo(User,{
    foreignKey: 'userId'
})

//Denuncia <-> Comentário
Denuncia.hasMany(Comment,{
    foreignKey: 'denunciaId',
    onDelete: 'CASCADE'
})
Comment.belongsTo(Denuncia,{
    foreignKey:'denunciaId'
})

// Like <-> User
User.hasMany(Like,{ 
    foreignKey: 'userId', 
    onDelete: 'CASCADE' 
})
Like.belongsTo(User,{ 
    foreignKey: 'userId' 
})

// Like <-> Denuncia
Denuncia.hasMany(Like,{ 
    foreignKey: 'denunciaId', 
    onDelete: 'CASCADE' 
})
Like.belongsTo(Denuncia,{ 
    foreignKey: 'denunciaId' 
})

//User <-> Share
User.hasMany(Share,{
    foreignKey: 'userId',
    onDelete: 'CASCADE'
})
Share.belongsTo(User,{
    foreignKey: 'userId'
})

//Denuncia <-> Share
Denuncia.hasMany(Share,{
    foreignKey:'denunciaId',
    onDelete: 'CASCADE'
})
Share.belongsTo(Denuncia,{
    foreignKey: 'denunciaId'
})

module.exports = {sequelize,User,Denuncia,Comment,Like,Share}