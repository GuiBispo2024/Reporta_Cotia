const ShareRepository = require('../repositories/ShareRepository')
const { Denuncia } = require('../models/rel')
const filterBadWords = require('../utils/filterBadWords')

class ShareService {
    
  // Compartilha uma denúncia com comentário opcional
  static async compartilhar({ denunciaId, comentario },user) {
    const { id: userId } = user
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) throw new Error('Denúncia não existe.')

    const { hasBadWord, filteredText } = filterBadWords(comentario || '')

    const share = await ShareRepository.create({
      userId,
      denunciaId,
      comentario: filteredText
    })

    return {
      message: hasBadWord
        ? 'Denúncia compartilhada (comentário censurado).'
        : 'Denúncia compartilhada com sucesso.',
      share
    }
  }

  // Lista todos os compartilhamentos de uma denúncia
  static async listarPorDenuncia(denunciaId) {
    const shares = await ShareRepository.findByDenunciaId(denunciaId)
    return shares
  }

  // Deleta um compartilhamento
  static async deletar(id,userId) {
    const share = await ShareRepository.findById(id)
    if (!share) throw new Error('Compartilhamento não encontrado.')
    if (share.userId !== userId) {
    throw new Error('Você não tem permissão para remover este compartilhamento.')
    }
    await ShareRepository.delete(id)
    return { message: 'Compartilhamento removido com sucesso.' }
  }
}

module.exports = ShareService