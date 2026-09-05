const LikeRepository = require('../repositories/LikeRepository')
const { Denuncia } = require('../models/rel')
const AppError = require('../utils/AppError')

async function requirePublicReport(denunciaId) {
  const denuncia = await Denuncia.findByPk(denunciaId)
  if (!denuncia || denuncia.status !== 'aprovada') throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND')
}

class LikeService {
    
  // Dá like em uma denúncia
  static async curtir({denunciaId },user) {
    const userId  = user.id
    await requirePublicReport(denunciaId)

    const [like, created] = await LikeRepository.createOrFind({userId, denunciaId})
    if (!created) throw new AppError('Usuário já curtiu essa denúncia.', 409, 'ALREADY_LIKED')

    return { message: 'Curtida registrada com sucesso.' }
  }

  // Lista todos os likes de uma denúncia
  static async listarPorDenuncia(denunciaId, options = {}) {
    await requirePublicReport(denunciaId)
    return LikeRepository.findByDenunciaId({ denunciaId, ...options })
  }

  // Remove like
  static async descurtir({denunciaId },user) {
    const userId  = user.id
    const like = await LikeRepository.findByUserAndDenuncia({userId, denunciaId})
    if (!like) throw new AppError('Curtida não encontrada.', 404, 'NOT_FOUND')
    await LikeRepository.delete({userId, denunciaId})
    return { message: 'Like removido com sucesso.' }
  }
}

module.exports = LikeService
