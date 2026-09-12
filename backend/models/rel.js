const {sequelize} = require('./db/db')
const User = require('./Reporta_Cotia_Tables/User')
const Denuncia = require('./Reporta_Cotia_Tables/Denuncia')
const Comment = require('./Reporta_Cotia_Tables/Comment')
const Like = require('./Reporta_Cotia_Tables/Like')
const Share = require('./Reporta_Cotia_Tables/Share')
const DenunciaHistorico = require('./Reporta_Cotia_Tables/DenunciaHistorico')
const PasswordResetToken = require('./Reporta_Cotia_Tables/PasswordResetToken')
const PasswordResetHistorico = require('./Reporta_Cotia_Tables/PasswordResetHistorico')
const Role = require('./Reporta_Cotia_Tables/Role')
const Permission = require('./Reporta_Cotia_Tables/Permission')
const UserRole = require('./Reporta_Cotia_Tables/UserRole')
const RolePermission = require('./Reporta_Cotia_Tables/RolePermission')

//User <-> Denuncia
User.hasMany(Denuncia,{
   foreignKey: 'userId',
   onDelete: 'CASCADE'
})
Denuncia.belongsTo(User,{
    foreignKey: 'userId'
})

Denuncia.hasMany(DenunciaHistorico, { foreignKey: 'denunciaId', onDelete: 'CASCADE' })
DenunciaHistorico.belongsTo(Denuncia, { foreignKey: 'denunciaId' })
User.hasMany(DenunciaHistorico, { foreignKey: 'userId', onDelete: 'SET NULL' })
DenunciaHistorico.belongsTo(User, { foreignKey: 'userId' })

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

Comment.hasMany(Comment, { as: 'Replies', foreignKey: 'parentCommentId', onDelete: 'CASCADE' })
Comment.belongsTo(Comment, { as: 'ParentComment', foreignKey: 'parentCommentId' })

User.hasMany(PasswordResetToken, { foreignKey: 'userId', onDelete: 'CASCADE' })
PasswordResetToken.belongsTo(User, { foreignKey: 'userId' })
User.hasMany(PasswordResetHistorico, { foreignKey: 'userId', onDelete: 'SET NULL' })
PasswordResetHistorico.belongsTo(User, { foreignKey: 'userId' })

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

// Users can have multiple roles and receive permissions through those roles.
// during the gradual migration to permission-based access control.
User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles'
})
Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'users'
})

Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions'
})
Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permissionId',
    otherKey: 'roleId',
    as: 'roles'
})

module.exports = {
    sequelize, User, Denuncia, Comment, Like, Share,
    DenunciaHistorico, PasswordResetToken, PasswordResetHistorico,
    Role, Permission, UserRole, RolePermission
}
