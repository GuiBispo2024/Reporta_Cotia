const ShareRepository = require('../repositories/ShareRepository')
const { Denuncia } = require('../models/rel')
const filterBadWords = require('../utils/filterBadWords')
const AppError = require('../utils/AppError')

async function requirePublicReport(denunciaId) {
  const denuncia = await Denuncia.findByPk(denunciaId)
  if (!denuncia || denuncia.status !== 'aprovada') throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND')
}

class ShareService {
    
  // Compartilha uma denúncia com comentário opcional
  static async compartilhar({ denunciaId, comentario },user) {
    const { id: userId } = user
    await requirePublicReport(denunciaId)

    const mensagem = typeof comentario === 'string' ? comentario.trim().slice(0, 255) : ''
    const { hasBadWord, filteredText } = filterBadWords(mensagem)

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
  static async listarPorDenuncia(denunciaId, options = {}) {
    await requirePublicReport(denunciaId)
    const shares = await ShareRepository.findByDenunciaId(denunciaId, options)
    return shares
  }

  // Deleta um compartilhamento
  static async deletar(id,userId) {
    const share = await ShareRepository.findById(id)
    if (!share) throw new AppError('Compartilhamento não encontrado.', 404, 'NOT_FOUND')
    if (share.userId !== userId) {
    throw new AppError('Você não tem permissão para remover este compartilhamento.', 403, 'FORBIDDEN')
    }
    await ShareRepository.delete(id)
    return { message: 'Compartilhamento removido com sucesso.' }
  }
}

module.exports = ShareService
