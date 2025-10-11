const sequelize = require('./db/db')
const User = require('./Reporta_Cotia_Tables/User')
const Denuncia = require('./Reporta_Cotia_Tables/Denuncia')
const Comment = require('./Reporta_Cotia_Tables/Comment')
const Like = require('./Reporta_Cotia_Tables/Like')
const Share = require('./Reporta_Cotia_Tables/Share') 

//User <-> Denuncia
User.hasMany(Denuncia,{
   foreignKey: 'userId',
   as: 'denuncias',
   onDelete: 'CASCADE'
})
Denuncia.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
})

//User <-> Comentário
User.hasMany(Comment,{
    foreignKey: 'userId',
    as: 'comentariosUser'
})
Comment.belongsTo(User,{
    foreignKey: 'userId',
    as: 'user'
})

//Denuncia <-> Comentário
Denuncia.hasMany(Comment,{
    foreignKey: 'denunciaId',
    as: 'comentariosDenuncia'
})
Comment.belongsTo(Denuncia,{
    foreignKey:'denunciaId',
    as: 'denuncia'
})

// Like <-> User,Denuncia
User.belongsTo(Denuncia,{
    through: Like,
    as: 'likesUser',
    foreignKey: 'userId'    
})
Denuncia.belongsTo(Denuncia,{
    through: Like,
    as: 'likesDenuncia',
    foreignKey: 'denunciaId'
})

//User <-> Share
User.hasMany(Share,{
    foreignKey: 'userId',
    as: 'sharesUser'
})
Share.belongsTo(User,{
    foreignKey: 'userId',
    as: 'user'
})

//Denuncia <-> Share
Denuncia.hasMany(Share,{
    foreignKey:'denunciaId',
    as: 'sharesDenuncia'
})
Share.belongsTo(Denuncia,{
    foreignKey: 'denunciaId',
    as: 'denuncia'
})

/*sequelize.sync({alter:true})
.then(()=> console.log("Tabelas sincronizadas"))
.catch((err)=>console.log("Erro ao sincronizar: ", err))
*/

module.exports = {sequelize,User,Denuncia,Comment,Like,Share}