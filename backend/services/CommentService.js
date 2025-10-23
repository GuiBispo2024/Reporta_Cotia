const CommentRepository = require('../repositories/CommentRepository')
const { User, Denuncia } = require('../models/rel')
const filterBadWords = require('../utils/filterBadWords')

class CommentService {
    
  // Cria um novo comentário
  static async create({ texto, userId, denunciaId }) {
    const user = await User.findByPk(userId)
    if (!user) throw new Error('Usuário não existe.')

    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) throw new Error('Denúncia não existe.')

    const { hasBadWord, filteredText } = filterBadWords(texto)
    const comentario = await CommentRepository.create({
      texto: filteredText,
      userId,
      denunciaId
    })

    return {
      message: hasBadWord
        ? 'Comentário publicado (palavras censuradas)'
        : 'Comentário publicado com sucesso',
      comentario
    }
  }

  // Lista todos os comentários de uma denúncia
  static async listarPorDenuncia(denunciaId) {
    const comentarios = await CommentRepository.findByDenunciaId(denunciaId)
    return comentarios
  }

  // Deleta um comentário
  static async deletar(id) {
    const rows = await CommentRepository.delete(id)
    if (!rows) throw new Error('Comentário não encontrado.')
    return { message: 'Comentário excluído com sucesso.' }
  }
}

module.exports = CommentService
