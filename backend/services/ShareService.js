const ShareRepository = require('../repositories/ShareRepository')
const { User, Denuncia } = require('../models/rel')
const { filterBadWords } = require('../utils/filterBadWords')

class ShareService {
    
  // Compartilha uma denúncia com comentário opcional
  static async compartilhar({ userId, denunciaId, comentario }) {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('Usuário não existe.')

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
  static async deletar(id) {
    const rows = await ShareRepository.delete(id)
    if (!rows) throw new Error('Compartilhamento não encontrado.')
    return { message: 'Compartilhamento removido com sucesso.' }
  }
}

module.exports = ShareService