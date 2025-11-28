const { Like, User} = require('../models/rel')

class LikeRepository {
  // Cria um like (findOrCreate evita duplicidade)
  static async createOrFind({userId, denunciaId}) {
    return Like.findOrCreate({ where: { userId, denunciaId } })
  }

  // Conta quantos likes uma denúncia tem e lista os usuários que deram like
  static async findByDenunciaId({denunciaId}) {
    return Like.findAll({
      where: { denunciaId },
      include: { model: User, attributes: ['id', 'username'] }
    })
  }

  // Busca um like pelo usuário e denúncia
  static async findByUserAndDenuncia({userId, denunciaId}) {
    return await Like.findOne({where: { userId, denunciaId }})  
  }

  // Remove um like
  static async delete({userId, denunciaId}) {
    return Like.destroy({ where: { userId, denunciaId } })
  }
}

module.exports = LikeRepository
