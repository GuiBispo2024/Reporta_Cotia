const { Like, User, Denuncia } = require('../models/rel')

class LikeRepository {
  // Cria um like (findOrCreate evita duplicidade)
  static async createOrFind(data) {
    const {userId, denunciaId} = data
    return Like.findOrCreate({ where: { userId, denunciaId } })
  }

  // Conta quantos likes uma denúncia tem e lista os usuários que deram like
static async findByDenunciaId(denunciaId) {
  const likes = await Like.findAll({
    where: { denunciaId },
    include: {model: User, attributes: ['id', 'username'] }
  })
  return {
    totalLikes: likes.length, likes}
}
  // Busca um like pelo usuário e denúncia
  static async findByUserAndDenuncia(userId, denunciaId) {
    return await Like.findOne({ userId, denunciaId })
  }

  // Remove um like
  static async delete(userId, denunciaId) {
    return Like.destroy({ where: { userId, denunciaId } })
  }
}

module.exports = LikeRepository
