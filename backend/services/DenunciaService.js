const DenunciaRepository = require('../repositories/DenunciaRepository')
const filterBadWords = require('../utils/filterBadWords')

class DenunciaService {
    
  // Cria uma nova denúncia
  static async create({ titulo, descricao, localizacao},user) {
    if (!titulo || !descricao || !localizacao) {
      throw new Error('Título, descrição e localização são obrigatórios.')
    }

    const { id: userId } = user
    const { hasBadWord: hasBadWordTitulo, filteredText: tituloFiltrado } = filterBadWords(titulo)
    const { hasBadWord: hasBadWordDescricao, filteredText: descricaoFiltrada } = filterBadWords(descricao)

    const denuncia = await DenunciaRepository.create({
      titulo: tituloFiltrado,
      descricao: descricaoFiltrada,
      localizacao,
      userId,
      status: 'pendente'
    })

    const hasBadWord = hasBadWordTitulo || hasBadWordDescricao

    return {
      message: hasBadWord
        ? 'Denúncia enviada para moderação (palavras censuradas)'
        : 'Denúncia enviada para moderação com sucesso',
      denuncia
    }
  }

  // Moderação (apenas admin)
  static async moderar(id, status, isAdm) {
    if (!isAdm) throw new Error('Acesso negado. Apenas administradores podem moderar denúncias.')
    if (!['pendente', 'aprovada', 'rejeitada'].includes(status)) {
      throw new Error('Status inválido.')
    }

    const denuncia = await DenunciaRepository.findById(id)
    if (!denuncia) throw new Error('Denúncia não encontrada.')

    await DenunciaRepository.update(id, { status })
    return { message: `Denúncia marcada como ${status}`, denuncia }
  }

  // Lista todas as denúncias
  static async listarTodas() {
    return DenunciaRepository.findAll()
  }

  // Busca denúncia por ID
  static async buscarPorId(id) {
    const denuncia = await DenunciaRepository.findById(id)
    if (!denuncia) throw new Error('Denúncia não encontrada.')
    return denuncia
  }

  // Lista denúncias de um usuário
  static async buscarPorUsuario(userId) {
    const denuncias = await DenunciaRepository.findByUserId(userId)
    if (!denuncias.length) throw new Error('Nenhuma denúncia encontrada para este usuário.')
    return denuncias
  }

  // Atualiza denúncia
  static async atualizar(id, data, userIdToken) {
    const denuncia = await DenunciaRepository.findById(id)
    if (!denuncia) throw new Error('Denúncia não encontrada.')
    if (denuncia.userId !== userIdToken) {
      throw new Error('Você não tem permissão para atualizar esta denúncia.')
    }
    await DenunciaRepository.update(id, data)
    return { message: 'Denúncia atualizada com sucesso.' }
  }

  // Deleta denúncia
  static async deletar(id,userId) {
    const denuncia = await DenunciaRepository.findById(id)
    if (!denuncia) throw new Error('Denúncia não encontrada.')
    if (denuncia.userId !== userId) {
      throw new Error('Você não tem permissão para excluir esta denúncia.')
    }
    await DenunciaRepository.delete(id)
    return { message: 'Denúncia excluída com sucesso.' }
  }
}

module.exports = DenunciaService