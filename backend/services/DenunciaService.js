const DenunciaRepository = require('../repositories/DenunciaRepository');
const filterBadWords = require('../utils/filterBadWords');
const AppError = require('../utils/AppError');
const { validateDenuncia } = require('../utils/validateDenuncia');

class DenunciaService {
  static async create(data, user) {
    validateDenuncia(data);
    const { titulo, descricao, localizacao, categoria = 'Outros', latitude, longitude, imageUrl } = data;
    const { id: userId } = user;

    const { hasBadWord: hasBadWordTitulo, filteredText: tituloFiltrado } = filterBadWords(titulo);
    const { hasBadWord: hasBadWordDescricao, filteredText: descricaoFiltrada } = filterBadWords(descricao);

    const denuncia = await DenunciaRepository.create({
      titulo: tituloFiltrado,
      descricao: descricaoFiltrada,
      tituloOriginal: hasBadWordTitulo ? titulo.trim() : null,
      descricaoOriginal: hasBadWordDescricao ? descricao.trim() : null,
      tituloCensurado: hasBadWordTitulo,
      descricaoCensurada: hasBadWordDescricao,
      localizacao: localizacao.trim(),
      categoria,
      latitude: latitude === '' ? null : latitude,
      longitude: longitude === '' ? null : longitude,
      imageUrl: imageUrl || null,
      userId,
      status: 'pendente',
      resolucaoStatus: 'aberta'
    });

    const hasBadWord = hasBadWordTitulo || hasBadWordDescricao;
    return {
      message: hasBadWord
        ? 'Denúncia enviada para moderação (palavras censuradas).'
        : 'Denúncia enviada para moderação com sucesso.',
      denuncia
    };
  }

  static async moderar(id, status, isAdm, motivoRejeicao = null) {
    if (!isAdm) throw new AppError('Acesso negado. Apenas administradores podem moderar denúncias.', 403, 'FORBIDDEN');
    if (!['pendente', 'aprovada', 'rejeitada'].includes(status)) {
      throw new AppError('Status de moderação inválido.', 400, 'VALIDATION_ERROR');
    }

    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');

    const motivo = status === 'rejeitada' && motivoRejeicao?.trim()
      ? motivoRejeicao.trim().slice(0, 1000)
      : null;
    await DenunciaRepository.update(id, { status, motivoRejeicao: motivo });
    denuncia.status = status;
    denuncia.motivoRejeicao = motivo;
    return { message: status === 'rejeitada' ? 'Denúncia rejeitada. O autor poderá consultar o motivo e corrigir o registro.' : `Denúncia marcada como ${status}.`, denuncia };
  }

  static async revisarCensura(id, field, manterCensura, isAdm) {
    if (!isAdm) throw new AppError('Apenas administradores podem revisar a censura.', 403, 'FORBIDDEN');
    if (!['titulo', 'descricao'].includes(field) || typeof manterCensura !== 'boolean') {
      throw new AppError('Informe um campo e uma decisão de censura válidos.', 400, 'VALIDATION_ERROR');
    }
    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    const originalKey = field === 'titulo' ? 'tituloOriginal' : 'descricaoOriginal';
    const flagKey = field === 'titulo' ? 'tituloCensurado' : 'descricaoCensurada';
    const original = denuncia[originalKey];
    if (!original) throw new AppError('Este campo não possui conteúdo censurado para revisão.', 409, 'NOT_CENSORED');
    const value = manterCensura ? filterBadWords(original).filteredText : original;
    await DenunciaRepository.update(id, { [field]: value, [flagKey]: manterCensura, [originalKey]: null });
    return { message: manterCensura ? 'A censura foi mantida.' : 'A censura foi removida após revisão.', field, value, censurado: manterCensura };
  }

  static async atualizarResolucao(id, resolucaoStatus, isAdm) {
    if (!isAdm) throw new AppError('Apenas administradores podem atualizar a resolução.', 403, 'FORBIDDEN');
    if (!['aberta', 'em_andamento', 'resolvida'].includes(resolucaoStatus)) {
      throw new AppError('Status de resolução inválido.', 400, 'VALIDATION_ERROR');
    }

    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');

    await DenunciaRepository.update(id, {
      resolucaoStatus,
      resolucaoAtualizadaEm: new Date()
    });

    return { message: `Resolução atualizada para ${resolucaoStatus}.` };
  }

  static async listarTodas(options = {}) {
    return DenunciaRepository.findAll(options);
  }

  static async listarPublicadas(options = {}) {
    return DenunciaRepository.findApproved(options);
  }

  static async getFiltered(options) {
    const allowedResolutionStatuses = ['aberta', 'em_andamento', 'resolvida'];
    if (options.resolucaoStatus && !allowedResolutionStatuses.includes(options.resolucaoStatus)) {
      throw new AppError('Selecione um status de resolução válido.', 400, 'VALIDATION_ERROR');
    }
    return DenunciaRepository.findWithFilters(options);
  }

  static async buscarPorId(id, requester = null) {
    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    const canSeePrivate = requester && (
      requester.adm || Number(requester.id) === Number(denuncia.userId)
    );
    if (denuncia.status !== 'aprovada' && !canSeePrivate) {
      throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    }
    if (requester?.adm) return denuncia;
    const plain = denuncia.get ? denuncia.get({ plain: true }) : { ...denuncia };
    delete plain.tituloOriginal;
    delete plain.descricaoOriginal;
    return plain;
  }

  static async buscarPorUsuario(userId) {
    return DenunciaRepository.findByUserId(userId);
  }

  static async atualizar(id, data, userIdToken) {
    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    if (Number(denuncia.userId) !== Number(userIdToken)) {
      throw new AppError('Você não tem permissão para atualizar esta denúncia.', 403, 'FORBIDDEN');
    }
    if (denuncia.status !== 'rejeitada') {
      throw new AppError('Apenas denúncias rejeitadas podem ser editadas.', 409, 'INVALID_STATUS');
    }
    validateDenuncia(data, { partial: true });

    const allowed = ['titulo', 'descricao', 'localizacao', 'categoria', 'latitude', 'longitude', 'imageUrl'];
    const dadosAtualizados = Object.fromEntries(
      Object.entries(data).filter(([key]) => allowed.includes(key))
    );
    if (data.titulo !== undefined) {
      const result = filterBadWords(data.titulo);
      dadosAtualizados.titulo = result.filteredText;
      dadosAtualizados.tituloOriginal = result.hasBadWord ? data.titulo.trim() : null;
      dadosAtualizados.tituloCensurado = result.hasBadWord;
    }
    if (data.descricao !== undefined) {
      const result = filterBadWords(data.descricao);
      dadosAtualizados.descricao = result.filteredText;
      dadosAtualizados.descricaoOriginal = result.hasBadWord ? data.descricao.trim() : null;
      dadosAtualizados.descricaoCensurada = result.hasBadWord;
    }
    dadosAtualizados.status = 'pendente';
    dadosAtualizados.motivoRejeicao = null;

    await DenunciaRepository.update(id, dadosAtualizados);
    return { message: 'Denúncia atualizada e reenviada para moderação.' };
  }

  static async deletar(id, userId) {
    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    if (Number(denuncia.userId) !== Number(userId)) {
      throw new AppError('Você não tem permissão para excluir esta denúncia.', 403, 'FORBIDDEN');
    }
    await DenunciaRepository.delete(id);
    return { message: 'Denúncia excluída com sucesso.' };
  }
}

module.exports = DenunciaService;
