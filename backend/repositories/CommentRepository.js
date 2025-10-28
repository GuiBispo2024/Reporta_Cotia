const { Comment, User } = require('../models/rel')

class CommentRepository {
    
  // Cria um novo comentário
  static async create(data) {
    return Comment.create(data)
  }

  // Busca todos os comentários de uma denúncia
  static async findByDenunciaId(denunciaId) {
    return Comment.findAll({
      where: { denunciaId },
      include: { model: User, attributes: ['id', 'username'] }
    })
  }

  // Busca um comentário pelo ID
  static async findById(id) {
    return Comment.findByPk(id)
  }

  //Atualiza um comentário
  static async update(id, data) {
    return Comment.update(data, { where: { id } })
  }

  // Deleta um comentário
  static async delete(id) {
    return Comment.destroy({ where: { id } })
  }

}

module.exports = CommentRepository