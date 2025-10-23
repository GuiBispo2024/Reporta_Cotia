const { Like, User, Denuncia } = require('../models/rel')

class LikeRepository {
  // Cria um like (findOrCreate evita duplicidade)
  static async createOrFind(userId, denunciaId) {
    return Like.findOrCreate({ where: { userId, denunciaId } })
  }

  // Conta quantos likes uma denúncia tem e lista os usuários
  static async findByDenunciaId(denunciaId) {
    const denuncia = await Denuncia.findByPk(denunciaId, {
      include: { model: User, attributes: ['id', 'username'] }
    })
    if (!denuncia) return null
    return { totalLikes: denuncia.likes.length, usuarios: denuncia.likes }
  }

  // Remove um like
  static async delete(userId, denunciaId) {
    return Like.destroy({ where: { userId, denunciaId } })
  }
}

module.exports = LikeRepository
