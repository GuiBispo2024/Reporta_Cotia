const LikeRepository = require('../repositories/LikeRepository')
const { User, Denuncia } = require('../models/rel')

class LikeService {
    
  // Dá like em uma denúncia
  static async curtir({ userId, denunciaId }) {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('Usuário não existe.')

    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) throw new Error('Denúncia não existe.')

    const [like, created] = await LikeRepository.createOrFind(userId, denunciaId)
    if (!created) throw new Error('Usuário já curtiu essa denúncia.')

    return { message: 'Curtida registrada com sucesso.' }
  }

  // Remove like
  static async descurtir({ userId, denunciaId }) {
    const rows = await LikeRepository.delete(userId, denunciaId)
    if (!rows) throw new Error('Like não encontrado.')
    return { message: 'Like removido com sucesso.' }
  }

  // Lista todos os likes de uma denúncia
  static async listarPorDenuncia(denunciaId) {
    const denunciaLikes = await LikeRepository.findByDenunciaId(denunciaId)
    if (!denunciaLikes) throw new Error('Denúncia não encontrada.')
    return denunciaLikes
  }
}

module.exports = LikeService