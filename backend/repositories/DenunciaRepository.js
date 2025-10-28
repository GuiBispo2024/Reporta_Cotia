const { Denuncia, User } = require('../models/rel')

class DenunciaRepository {

    //Cria uma denúncia
    static async create(data) {
        return Denuncia.create(data)
    }

    //Busca uma denúncia específica
    static async findById(id) {
        return Denuncia.findByPk(id, {
        include: { model: User, attributes: ['id'] }
        })
    }

    //Lista todas as Denúncias
    static async findAll() {
        return Denuncia.findAll({
        include: { model: User, attributes: ['id'] }
        })
    }

    //Busca todas as denúncias de um usuário específico
    static async findByUserId(userId) {
        return Denuncia.findAll({ where: { userId } }
        )
    }

    //Altera uma denúncia
    static async update(id, data) {
        return Denuncia.update(data, { where: { id } })
    }

    //Deleta uma denúncia
    static async delete(id) {
        return Denuncia.destroy({ where: { id } })
    }
}

module.exports = DenunciaRepository