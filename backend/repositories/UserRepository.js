const {User, Denuncia, sequelize, Role, Permission} = require('../models/rel')
const { Op } = require('sequelize')

class UserRepository{

    //Cria um novo usuário
    static async create(data){
        return User.create(data)
    }

    static async createWithRoles(data, roleNames, roleDescriptions = {}) {
        return sequelize.transaction(async transaction => {
            const user = await User.create(data, { transaction })
            for (const roleName of roleNames) {
                const [role] = await Role.findOrCreate({
                    where: { name: roleName },
                    defaults: {
                        description: roleDescriptions[roleName] || `Perfil ${roleName}`
                    },
                    transaction
                })
                await user.addRole(role, { transaction })
            }
            return user
        })
    }

    //Procura usuário pelo email
    static async findByEmail(email) {
        return User.findOne({ where: { email } })
    }

    //Procura usuário pelo username
    static async findByUsername(username) {
        return User.findOne({ where: { username } })
    }

    //Lista todos os usuários
    static async findAll() {
        return User.findAll({ attributes: ['id', 'username', 'adm', 'avatarUrl'] })
    }

    //Lista todos os usuários com a contagem de denúncias feitas por cada um
    static async findAllUsersWithDenuniaCount(includeEmail = false, { page = 1, limit = 20, search = '', sort = 'username' } = {}) {
        const where = search ? { username: { [sequelize.getDialect() === 'sqlite' ? Op.like : Op.iLike]: `%${search}%` } } : {}
        const order = sort === 'contributions'
          ? [[sequelize.literal('"totalDenuncias"'), 'DESC']]
          : [['username', 'ASC']]
        const offset = (page - 1) * limit
        const [rows, total] = await Promise.all([User.findAll({
            where,
            include: [{
                model: Denuncia,
                attributes: [],
                where:{
                    status: 'aprovada'
                },
                required: false
            }],
            attributes: [
                "id",
                "username",
                "adm",
                "avatarUrl",
                ...(includeEmail ? ["email"] : []),
                [sequelize.fn("COUNT", sequelize.col("Denuncia.id")), "totalDenuncias"]
            ],
            group: ["User.id"],
            order,
            limit,
            offset,
            subQuery: false
         }), User.count({ where })])
        return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) }
    }

    //Busca um usuário específico
    static async findById(id) {
        return User.findByPk(id)
    }

    static async findByIdWithAccess(id, attributes = null) {
        const options = {
            include: [{
                model: Role,
                as: 'roles',
                attributes: ['name'],
                through: { attributes: [] },
                include: [{
                    model: Permission,
                    as: 'permissions',
                    attributes: ['key'],
                    through: { attributes: [] }
                }]
            }]
        }
        if (attributes) options.attributes = attributes
        return User.findByPk(id, options)
    }

    static async findPublicById(id) {
        return User.findByPk(id, { attributes: ['id', 'username', 'adm', 'avatarUrl'] })
    }

    //Altera um usuário
    static async update(id, data) {
        return User.update(data, { where: { id } })
    }

    //Conta quantos usuários administradores existem
    static async countAdmins() {
        return User.count({ where: { adm: true } })
    }

    //Altera perfil de administrador(apenas adm pode fazer)
    static async updateAdm(id, adm) {
        return User.update({ adm }, { where: { id } })
    }

    //Deleta um usuário
    static async delete(id) {
        return User.destroy({ where: { id } })
    }
}

module.exports = UserRepository
