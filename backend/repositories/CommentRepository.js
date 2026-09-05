const { Comment, User } = require('../models/rel')

class CommentRepository {
    
  // Cria um novo comentário
  static async create(data) {
    return Comment.create(data)
  }

  // Busca todos os comentários de uma denúncia
  static async findByDenunciaId(denunciaId, includeSensitive = false, { page = null, limit = null } = {}) {
    const query = {
      where: { denunciaId, parentCommentId: null },
      include: [
        { model: User, attributes: ['id', 'username', 'avatarUrl'] },
        {
          model: Comment,
          as: 'Replies',
          separate: true,
          include: [{ model: User, attributes: ['id', 'username', 'avatarUrl'] }],
          order: [['createdAt', 'ASC']],
          attributes: includeSensitive ? undefined : { exclude: ['comentarioOriginal'] }
        }
      ],
      order: [['createdAt', 'DESC']],
      attributes: includeSensitive ? undefined : { exclude: ['comentarioOriginal'] }
    }
    if (page && limit) {
      const [{ rows, count }, totalComments] = await Promise.all([
        Comment.findAndCountAll({ ...query, limit, offset: (page - 1) * limit, distinct: true }),
        Comment.count({ where: { denunciaId } })
      ])
      return { totalComments, totalThreads: count, comments: rows, page, limit, totalPages: Math.ceil(count / limit) }
    }
    const [comments, totalComments] = await Promise.all([
      Comment.findAll(query),
      Comment.count({ where: { denunciaId } })
    ])
    return{
      totalComments, totalThreads: comments.length, comments
    }
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
