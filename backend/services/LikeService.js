const LikeRepository = require('../repositories/LikeRepository')
const { User, Denuncia } = require('../models/rel')

class LikeService {
    
  // Dá like em uma denúncia
  static async curtir({denunciaId },user) {
    const { id: userId } = user
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) throw new Error('Denúncia não existe.')

    const [like, created] = await LikeRepository.createOrFind(userId, denunciaId)
    if (!created) throw new Error('Usuário já curtiu essa denúncia.')

    return { message: 'Curtida registrada com sucesso.' }
  }

  // Lista todos os likes de uma denúncia
  static async listarPorDenuncia(denunciaId) {
    const denunciaLikes = await LikeRepository.findByDenunciaId(denunciaId)
    if (!denunciaLikes) throw new Error('Denúncia não encontrada.')
    return denunciaLikes
  }

  // Remove like
  static async descurtir({ userId, denunciaId }) {
    const like = await LikeRepository.findByUserAndDenuncia(userId, denunciaId)
    if (!like) throw new Error('Like não encontrado.')
    await LikeRepository.delete(userId, denunciaId)
    return { message: 'Like removido com sucesso.' }
  }
}

module.exports = LikeService