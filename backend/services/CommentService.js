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

  //Altera um comentário(somente usuário que criou pode alterar)
 static async atualizar(id, data, userId) {
    const comment = await CommentRepository.findById(id)
    if (!comment) throw new Error('Comentário não encontrado.')
    if (comment.userId !== userId) {
      throw new Error('Você não tem permissão para atualizar este comentário.')
    }
    const [rowsUpdate] = await CommentRepository.update(id, data)
    if (!rowsUpdate) throw new Error('Falha ao atualizar o comentário.')
    return { message: 'Comentário atualizado com sucesso.' }
  }

  // Deleta um comentário(user que criou ou adm pode deletar)
  static async deletar(id,userId,adm) {
    const comment = await CommentRepository.findById(id)
    if (!comment) throw new Error('Comentário não encontrado.')
    if (comment.userId !== userId && !adm) {
      throw new Error('Você não tem permissão para excluir este comentário.')
    }
    await CommentRepository.delete(id)
    return { message: 'Comentário excluído com sucesso.' }
  }
}

module.exports = CommentService