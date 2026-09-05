const CommentRepository = require('../repositories/CommentRepository')
const { Denuncia } = require('../models/rel')
const filterBadWords = require('../utils/filterBadWords')
const AppError = require('../utils/AppError')

async function requirePublicReport(denunciaId) {
  const denuncia = await Denuncia.findByPk(denunciaId)
  if (!denuncia || denuncia.status !== 'aprovada') throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND')
}

class CommentService {
  static async create({ comentario, denunciaId, parentCommentId = null }, user) {
    await requirePublicReport(denunciaId)
    if (typeof comentario !== 'string' || !comentario.trim()) throw new AppError('Comentário não pode ficar vazio.', 400, 'VALIDATION_ERROR')
    if (comentario.trim().length > 255) throw new AppError('Comentário deve ter no máximo 255 caracteres.', 400, 'VALIDATION_ERROR')
    const { hasBadWord, filteredText } = filterBadWords(comentario.trim())
    let parent = null
    if (parentCommentId) {
      parent = await CommentRepository.findById(parentCommentId)
      if (!parent || Number(parent.denunciaId) !== Number(denunciaId)) throw new AppError('Comentário original não encontrado.', 404, 'NOT_FOUND')
      if (parent.parentCommentId) throw new AppError('Respostas podem ter somente um nível.', 400, 'NESTING_LIMIT')
    }
    const Comentario = await CommentRepository.create({
      comentario: filteredText,
      comentarioOriginal: hasBadWord ? comentario.trim() : null,
      censurado: hasBadWord,
      censuraRevisada: false,
      userId: user.id,
      denunciaId,
      parentCommentId: parent?.id || null
    })
    return { message: hasBadWord ? 'Comentário publicado (palavras censuradas)' : 'Comentário publicado com sucesso', Comentario }
  }

  static async listarPorDenuncia(denunciaId, includeSensitive = false, options = {}) {
    await requirePublicReport(denunciaId)
    return CommentRepository.findByDenunciaId(denunciaId, includeSensitive, options)
  }

  static async atualizar(id, data, userId) {
    const comment = await CommentRepository.findById(id)
    if (!comment) throw new AppError('Comentário não encontrado.', 404, 'NOT_FOUND')
    if (Number(comment.userId) !== Number(userId)) throw new AppError('Você não tem permissão para atualizar este comentário.', 403, 'FORBIDDEN')
    if (!data.comentario || !data.comentario.trim()) throw new AppError('Comentário não pode ficar vazio.', 400, 'VALIDATION_ERROR')
    if (data.comentario.trim().length > 255) throw new AppError('Comentário deve ter no máximo 255 caracteres.', 400, 'VALIDATION_ERROR')
    const result = filterBadWords(data.comentario.trim())
    await CommentRepository.update(id, {
      comentario: result.filteredText,
      comentarioOriginal: result.hasBadWord ? data.comentario.trim() : null,
      censurado: result.hasBadWord,
      censuraRevisada: false
    })
    return { message: 'Comentário atualizado com sucesso.' }
  }

  static async revisarCensura(id, manterCensura, adm) {
    if (!adm) throw new AppError('Apenas administradores podem revisar a censura.', 403, 'FORBIDDEN')
    if (typeof manterCensura !== 'boolean') throw new AppError('Informe uma decisão de censura válida.', 400, 'VALIDATION_ERROR')
    const comment = await CommentRepository.findById(id)
    if (!comment) throw new AppError('Comentário não encontrado.', 404, 'NOT_FOUND')
    if (!comment.comentarioOriginal) throw new AppError('Este comentário não possui conteúdo censurado para revisão.', 409, 'NOT_CENSORED')
    const comentario = manterCensura ? filterBadWords(comment.comentarioOriginal).filteredText : comment.comentarioOriginal
    await CommentRepository.update(id, { comentario, censurado: manterCensura, censuraRevisada: true })
    return { message: manterCensura ? 'A censura do comentário foi mantida.' : 'A censura do comentário foi removida.', comentario, censurado: manterCensura }
  }

  static async deletar(id, userId, adm) {
    const comment = await CommentRepository.findById(id)
    if (!comment) throw new AppError('Comentário não encontrado.', 404, 'NOT_FOUND')
    if (Number(comment.userId) !== Number(userId) && !adm) throw new AppError('Você não tem permissão para excluir este comentário.', 403, 'FORBIDDEN')
    await CommentRepository.delete(id)
    return { message: 'Comentário excluído com sucesso.' }
  }
}

module.exports = CommentService
