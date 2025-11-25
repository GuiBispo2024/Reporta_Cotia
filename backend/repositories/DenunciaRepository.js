const { Denuncia, User, Like, sequelize} = require('../models/rel')

class DenunciaRepository {

    //Cria uma denúncia
    static async create(data) {
        return Denuncia.create(data)
    }

    //Busca uma denúncia específica
    static async findById(id) {
        return Denuncia.findByPk(id, {
        include: { model: User, attributes: ['id','username'] }
        })
    }

    //Lista todas as Denúncias
    static async findAll() {
        return Denuncia.findAll({
        include:[ { model: User, attributes: ['id','username']},
                  { model: Like, attributes: [] }
        ],
        attributes: {
        include: [
          [
            sequelize.fn("COUNT", sequelize.col("Likes.id")),
            "likesCount"
          ]
        ]
      },
      group: ["Denuncia.id", "User.id"],
      order: [[sequelize.literal('COUNT("Likes"."id")'), "DESC"]]
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