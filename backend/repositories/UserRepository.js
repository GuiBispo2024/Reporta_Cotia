const {User, Denuncia, sequelize} = require('../models/rel')

class UserRepository{

    //Cria um novo usuário
    static async create(data){
        return User.create(data)
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
        return User.findAll()
    }

    //Lista todos os usuários com a contagem de denúncias feitas por cada um
    static async findAllUsersWithDenuniaCount() {
        return User.findAll({
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
                "email",
                "adm",
                [sequelize.fn("COUNT", sequelize.col("Denuncia.id")), "totalDenuncias"]
            ],
            group: ["User.id"]
         });
    }

    //Busca um usuário específico
    static async findById(id) {
        return User.findByPk(id)
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