const sequelize = require('./db/db')
const User = require('./Reporta_Cotia/User')
const Denuncia = require('./Reporta_Cotia/Denuncia')
const Comment = require('./Reporta_Cotia/Comment')
const Like = require('./Reporta_Cotia/Like')
const Share = require('./Reporta_Cotia/Share') 

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
    as: 'comentarios'
})
Comment.belongsTo(User,{
    foreignKey: 'userId',
    as: 'user'
})

//Denuncia <-> Comentário
Denuncia.hasMany(Comment,{
    foreignKey: 'denunciaId',
    as: 'comentarios'
})
Comment.belongsTo(Denuncia,{
    foreignKey:'denunciaId',
    as: 'denuncia'
})

// Like <-> User,Denuncia
User.belongsTo(Denuncia,{
    through: Like,
    as: 'likes',
    foreignKey: 'userId'    
})
Denuncia.belongsTo(Denuncia,{
    through: Like,
    as: 'likes',
    foreignKey: 'denunciaId'
})

//User <-> Share
User.hasMany(Share,{
    foreignKey: 'userId',
    as: 'shares'
})
Share.belongsTo(User,{
    foreignKey: 'userId',
    as: 'user'
})

//Denuncia <-> Share
Denuncia.hasMany(Share,{
    foreignKey:'denunciaId',
    as: 'shares'
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