const { Comment, User } = require('../models/rel')
const { Op } = require('sequelize')

class CommentRepository {
    
  // Cria um novo comentário
  static async create(data) {
    return Comment.create(data)
  }

  // Busca todos os comentários de uma denúncia
  static async findByDenunciaId(denunciaId, includeSensitive = false, { page = null, limit = null, sort = 'newest' } = {}) {
    const direction = sort === 'oldest' ? 'ASC' : 'DESC'
    const query = {
      where: { denunciaId, parentCommentId: null },
      include: [
        { model: User, attributes: ['id', 'username', 'avatarUrl'] }
      ],
      order: [['createdAt', direction], ['id', direction]],
      attributes: includeSensitive ? undefined : { exclude: ['comentarioOriginal'] }
    }
    const attachReplies = async roots => {
      const replies = await Comment.findAll({
        where: { denunciaId, parentCommentId: { [Op.ne]: null } },
        include: [{ model: User, attributes: ['id', 'username', 'avatarUrl'] }],
        order: [['createdAt', 'ASC'], ['id', 'ASC']],
        attributes: includeSensitive ? undefined : { exclude: ['comentarioOriginal'] }
      })
      const nodes = new Map([...roots, ...replies].map(row => {
        const node = { ...row.toJSON(), Replies: [] }
        return [node.id, node]
      }))
      for (const reply of replies) {
        nodes.get(reply.parentCommentId)?.Replies.push(nodes.get(reply.id))
      }
      return roots.map(root => nodes.get(root.id))
    }
    if (page && limit) {
      const [{ rows, count }, totalComments] = await Promise.all([
        Comment.findAndCountAll({ ...query, limit, offset: (page - 1) * limit, distinct: true }),
        Comment.count({ where: { denunciaId } })
      ])
      return { totalComments, totalThreads: count, comments: await attachReplies(rows), page, limit, totalPages: Math.ceil(count / limit) }
    }
    const [comments, totalComments] = await Promise.all([
      Comment.findAll(query),
      Comment.count({ where: { denunciaId } })
    ])
    return{
      totalComments, totalThreads: comments.length, comments: await attachReplies(comments)
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
