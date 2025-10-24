const {User} = require('../models/rel')

class UserRepository{

    //Cria um novo usuário
    static async create(data){
        return User.create(data)
    }

    //Faz login
    static async findByEmail(email) {
        return User.findOne({ where: { email } })
    }

    //Lista todos os usuários
    static async findAll() {
        return User.findAll()
    }

    //Busca um usuário específico
    static async findById(id) {
        return User.findByPk(id)
    }

    //Altera um usuário
    static async update(id, data) {
        return User.update(data, { where: { id } })
    }

    //Deleta um usuário
    static async delete(id) {
        return User.destroy({ where: { id } })
    }
}

module.exports = UserRepository