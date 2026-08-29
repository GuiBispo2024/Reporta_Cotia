const CommentRepository = require('../repositories/CommentRepository')
const { Denuncia } = require('../models/rel')
const filterBadWords = require('../utils/filterBadWords')

class CommentService {
    
  // Cria um novo comentário
  static async create({ comentario, denunciaId },user) {
    const { id: userId } = user
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) throw new Error('Denúncia não existe.')

    const { hasBadWord, filteredText } = filterBadWords(comentario)
    const Comentario = await CommentRepository.create({
      comentario: filteredText,
      comentarioOriginal: hasBadWord ? comentario.trim() : null,
      censurado: hasBadWord,
      censuraRevisada: false,
      userId,
      denunciaId
    })

    return {
      message: hasBadWord
        ? 'Comentário publicado (palavras censuradas)'
        : 'Comentário publicado com sucesso',
      Comentario
    }
  }

  // Lista todos os comentários de uma denúncia
  static async listarPorDenuncia(denunciaId, includeSensitive = false) {
    const comentarios = await CommentRepository.findByDenunciaId(denunciaId, includeSensitive)
    return comentarios
  }

  //Altera um comentário(somente usuário que criou pode alterar)
 static async atualizar(id, data, userId) {
    const comment = await CommentRepository.findById(id)
    if (!comment) throw new Error('Comentário não encontrado.')
    if (comment.userId !== userId) {
      throw new Error('Você não tem permissão para atualizar este comentário.')
    }
    if (!data.comentario || !data.comentario.trim()) throw new Error('Comentário não pode ficar vazio.')
    const result = filterBadWords(data.comentario.trim())
    const [rowsUpdate] = await CommentRepository.update(id, {
      comentario: result.filteredText,
      comentarioOriginal: result.hasBadWord ? data.comentario.trim() : null,
      censurado: result.hasBadWord,
      censuraRevisada: false
    })
    if (!rowsUpdate) throw new Error('Falha ao atualizar o comentário.')
    return { message: 'Comentário atualizado com sucesso.' }
  }

  static async revisarCensura(id, manterCensura, adm) {
    if (!adm) throw new Error('Apenas administradores podem revisar a censura.')
    if (typeof manterCensura !== 'boolean') throw new Error('Informe uma decisão de censura válida.')
    const comment = await CommentRepository.findById(id)
    if (!comment) throw new Error('Comentário não encontrado.')
    if (!comment.comentarioOriginal) throw new Error('Este comentário não possui conteúdo censurado para revisão.')
    const comentario = manterCensura
      ? filterBadWords(comment.comentarioOriginal).filteredText
      : comment.comentarioOriginal
    await CommentRepository.update(id, { comentario, censurado: manterCensura, censuraRevisada: true })
    return { message: manterCensura ? 'A censura do comentário foi mantida.' : 'A censura do comentário foi removida.', comentario, censurado: manterCensura }
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
