const DenunciaRepository = require('../repositories/DenunciaRepository');
const { DenunciaHistorico, User } = require('../models/rel');
const filterBadWords = require('../utils/filterBadWords');
const AppError = require('../utils/AppError');
const { validateDenuncia } = require('../utils/validateDenuncia');
const { deleteImage } = require('../utils/upload');
const { PERMISSIONS } = require('../constants/accessControl');
const { hasPermission } = require('../utils/authorization');

function removeCensorshipSource(report) {
  const visible = report?.get ? report.get({ plain: true }) : { ...report };
  delete visible.tituloOriginal;
  delete visible.descricaoOriginal;
  return visible;
}

function protectCensorshipSources(result, requester) {
  if (hasPermission(requester, PERMISSIONS.CENSORSHIP_REVIEW)) return result;
  if (Array.isArray(result)) return result.map(removeCensorshipSource);
  if (Array.isArray(result?.data)) return { ...result, data: result.data.map(removeCensorshipSource) };
  return result;
}

class DenunciaService {
  static async create(data, user) {
    validateDenuncia(data);
    const { titulo, descricao, localizacao, categoria = 'Outros', latitude, longitude, imageUrl, imageUrls = [] } = data;
    if (!Array.isArray(imageUrls) || imageUrls.length > 4) throw new AppError('Envie no máximo 4 imagens.', 400, 'IMAGE_LIMIT');
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
      imageUrls,
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

  static async moderar(id, status, motivoRejeicao = null, moderatorId = null) {
    if (!['pendente', 'aprovada', 'rejeitada'].includes(status)) {
      throw new AppError('Status de moderação inválido.', 400, 'VALIDATION_ERROR');
    }

    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');

    if (status === 'rejeitada' && !motivoRejeicao?.trim()) {
      throw new AppError('Informe o motivo da rejeição.', 400, 'REJECTION_REASON_REQUIRED');
    }
    const motivo = status === 'rejeitada' ? motivoRejeicao.trim().slice(0, 1000) : null;
    const statusAnterior = denuncia.status;
    await DenunciaRepository.update(id, { status, motivoRejeicao: motivo });
    if (status !== 'aprovada') {
      await DenunciaRepository.clearSocialHistory(id);
    }
    if (moderatorId) await DenunciaHistorico.create({ tipo: 'moderacao', statusAnterior, statusNovo: status, motivo, denunciaId: id, userId: moderatorId });
    denuncia.status = status;
    denuncia.motivoRejeicao = motivo;
    return { message: status === 'rejeitada' ? 'Denúncia rejeitada. O autor poderá consultar o motivo e corrigir o registro.' : `Denúncia marcada como ${status}.`, denuncia };
  }

  static async revisarCensura(id, field, manterCensura) {
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

  static async atualizarResolucao(id, resolucaoStatus, details = {}, moderatorId = null) {
    if (!['aberta', 'em_andamento', 'resolvida'].includes(resolucaoStatus)) {
      throw new AppError('Status de resolução inválido.', 400, 'VALIDATION_ERROR');
    }

    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');

    const setoresPermitidos = [
      'Secretaria de Infraestrutura e Obras',
      'Secretaria de Mobilidade e Trânsito',
      'Secretaria do Verde e Meio Ambiente',
      'Secretaria de Saúde',
      'Secretaria de Educação',
      'Secretaria de Segurança Pública',
      'Serviço de Iluminação Pública',
      'Limpeza Urbana e Zeladoria',
      'Defesa Civil',
      'A definir'
    ];
    const statusAnterior = denuncia.resolucaoStatus;
    const setorResponsavel = typeof details.setorResponsavel === 'string'
      ? details.setorResponsavel.trim().slice(0, 120)
      : '';
    if (setorResponsavel && !setoresPermitidos.includes(setorResponsavel)) {
      throw new AppError('Selecione um setor responsável válido.', 400, 'VALIDATION_ERROR');
    }
    const setorAtual = denuncia.setorResponsavel || '';
    if (denuncia.resolucaoStatus === resolucaoStatus && setorAtual === setorResponsavel) {
      return {
        message: 'Nenhuma alteração para salvar.',
        resolucaoStatus: denuncia.resolucaoStatus,
        setorResponsavel: denuncia.setorResponsavel || null,
        changed: false
      };
    }
    await DenunciaRepository.update(id, {
      resolucaoStatus,
      setorResponsavel: setorResponsavel || null,
      resolucaoAtualizadaEm: new Date()
    });
    if (moderatorId) await DenunciaHistorico.create({
      tipo: 'resolucao',
      statusAnterior,
      statusNovo: resolucaoStatus,
      responsavel: setorResponsavel || null,
      denunciaId: id,
      userId: moderatorId
    });

    return {
      message: 'Andamento e setor responsável atualizados com sucesso.',
      resolucaoStatus,
      setorResponsavel: setorResponsavel || null,
      changed: true
    };
  }

  static async listarTodas(options = {}, requester = null) {
    return protectCensorshipSources(await DenunciaRepository.findAll(options), requester);
  }

  static async listarPublicadas(options = {}) {
    return DenunciaRepository.findApproved(options);
  }

  static async getFiltered(options, requester = null) {
    const allowedResolutionStatuses = ['aberta', 'em_andamento', 'resolvida'];
    if (options.resolucaoStatus && !allowedResolutionStatuses.includes(options.resolucaoStatus)) {
      throw new AppError('Selecione um status de resolução válido.', 400, 'VALIDATION_ERROR');
    }
    const result = await DenunciaRepository.findWithFilters(options);
    result.data = await DenunciaRepository.addEngagementStats(result.data, requester?.id);
    return result;
  }

  static async buscarPorId(id, requester = null) {
    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    const canSeePrivate = requester && (
      hasPermission(requester, PERMISSIONS.MODERATION_VIEW) || Number(requester.id) === Number(denuncia.userId)
    );
    if (denuncia.status !== 'aprovada' && !canSeePrivate) {
      throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    }
    const visible = denuncia.get ? denuncia.get({ plain: true }) : { ...denuncia };
    if (!hasPermission(requester, PERMISSIONS.CENSORSHIP_REVIEW)) {
      delete visible.tituloOriginal;
      delete visible.descricaoOriginal;
    }
    if (denuncia.status === 'aprovada') {
      const enriched = await DenunciaRepository.addEngagementStats([visible], requester?.id);
      return enriched?.[0] || visible;
    }
    return visible;
  }

  static async buscarHistorico(id, requester = null) {
    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    const canSee = denuncia.status === 'aprovada' || hasPermission(requester, PERMISSIONS.AUDIT_VIEW) || Number(requester?.id) === Number(denuncia.userId);
    if (!canSee) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    return DenunciaHistorico.findAll({
      where: { denunciaId: id },
      include: [{ model: User, attributes: ['id', 'username', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']]
    });
  }

  static async buscarPorUsuario(userId) {
    return DenunciaRepository.findByUserId(userId);
  }

  static async buscarPublicadasPorUsuario(userId, options) {
    return DenunciaRepository.findApprovedByUserId(userId, options);
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

    const allowed = ['titulo', 'descricao', 'localizacao', 'categoria', 'latitude', 'longitude', 'imageUrl', 'imageUrls'];
    const dadosAtualizados = Object.fromEntries(
      Object.entries(data).filter(([key]) => allowed.includes(key))
    );
    for (const coordinate of ['latitude', 'longitude']) {
      if (coordinate in dadosAtualizados && (
        dadosAtualizados[coordinate] == null ||
        (typeof dadosAtualizados[coordinate] === 'string' && !dadosAtualizados[coordinate].trim())
      )) {
        dadosAtualizados[coordinate] = null;
      }
    }
    if (dadosAtualizados.imageUrls && (!Array.isArray(dadosAtualizados.imageUrls) || dadosAtualizados.imageUrls.length > 4)) throw new AppError('Envie no máximo 4 imagens.', 400, 'IMAGE_LIMIT');
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
    await DenunciaRepository.clearSocialHistory(id);
    return { message: 'Denúncia atualizada e reenviada para moderação.' };
  }

  static async deletar(id, userId) {
    const denuncia = await DenunciaRepository.findById(id);
    if (!denuncia) throw new AppError('Denúncia não encontrada.', 404, 'NOT_FOUND');
    if (Number(denuncia.userId) !== Number(userId)) {
      throw new AppError('Você não tem permissão para excluir esta denúncia.', 403, 'FORBIDDEN');
    }
    if (denuncia.status === 'aprovada') {
      throw new AppError('Denúncias publicadas são preservadas no histórico público.', 409, 'INVALID_STATUS');
    }
    await DenunciaRepository.delete(id);
    const images = denuncia.imageUrls?.length ? denuncia.imageUrls : [denuncia.imageUrl];
    await Promise.all(images.filter(Boolean).map(url => deleteImage(url).catch(() => {})));
    return { message: 'Denúncia excluída com sucesso.' };
  }
}

module.exports = DenunciaService;
