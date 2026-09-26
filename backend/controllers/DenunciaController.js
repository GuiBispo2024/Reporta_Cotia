const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const requirePermission = require('../middlewares/requirePermission');
const optionalAuth = require('../middlewares/optionalAuth');
const AppError = require('../utils/AppError');
const DenunciaService = require('../services/DenunciaService');
const { upload, storeImages, deleteImage } = require('../utils/upload');
const { PERMISSIONS } = require('../constants/accessControl');
const { validateDenuncia } = require('../utils/validateDenuncia');
const { hasPermission } = require('../utils/authorization');

function pagination(req) {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 12);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) {
    throw new AppError('Informe page inteiro positivo e limit entre 1 e 50.', 400, 'VALIDATION_ERROR');
  }
  return { hasPagination, page, limit };
}

/**
 * @swagger
 * tags:
 *   name: Denúncias
 *   description: Gerenciamento de denúncias urbanas
 */

/**
 * @swagger
 * /denuncia:
 *   post:
 *     summary: Cria uma denúncia
 *     description: Exige a permissão `denuncia.create`.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [titulo, descricao, localizacao]
 *             properties:
 *               titulo: { type: string, maxLength: 120 }
 *               descricao: { type: string, maxLength: 2000 }
 *               localizacao: { type: string, maxLength: 255 }
 *               bairro: { type: string, maxLength: 120 }
 *               categoria: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               imagens: { type: array, maxItems: 4, items: { type: string, format: binary } }
 *     responses:
 *       201: { description: Denúncia criada e enviada à moderação }
 *       400: { description: Dados ou imagens inválidos }
 *       401: { description: Sessão ausente, expirada ou revogada }
 *       403: { description: Usuário sem `denuncia.create` }
 */
router.post('/', auth, requirePermission(PERMISSIONS.DENUNCIA_CREATE), upload.array('imagens', 4), async (req, res, next) => {
  let imageUrls = [];
  try {
    validateDenuncia(req.body);
    imageUrls = await storeImages(req.files || []);
    res.status(201).json(await DenunciaService.create({ ...req.body, imageUrls, imageUrl: imageUrls[0] || null }, req.user, { uploadedImages: true }));
  } catch (error) { await Promise.all(imageUrls.map(url => deleteImage(url).catch(() => {}))); next(error); }
});

/**
 * @swagger
 * /denuncia/{id}/moderar:
 *   patch:
 *     summary: Aprova ou rejeita uma denúncia
 *     description: Exige a permissão `moderation.review`. Ao rejeitar, o motivo é obrigatório e fica disponível ao autor.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pendente, aprovada, rejeitada] }
 *               motivoRejeicao: { type: string, maxLength: 1000, description: Obrigatório quando o status for rejeitada. }
 *     responses:
 *       200: { description: Moderação registrada }
 *       400: { description: Status ou motivo inválido }
 *       401: { description: Sessão ausente, expirada ou revogada }
 *       403: { description: Usuário sem `moderation.review` }
 *       404: { description: Denúncia não encontrada }
 */
router.patch('/:id/moderar', auth, requirePermission(PERMISSIONS.MODERATION_REVIEW), async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.moderar(req.params.id, req.body.status, req.body.motivoRejeicao, req.user.id));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}/censura:
 *   patch:
 *     summary: Revisa a censura automática de uma denúncia
 *     description: Permite manter ou retirar a censura do título ou da descrição. Exige `censorship.review`.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field, manterCensura]
 *             properties:
 *               field: { type: string, enum: [titulo, descricao] }
 *               manterCensura: { type: boolean }
 *     responses:
 *       200: { description: Decisão de censura registrada }
 *       400: { description: Campo ou decisão inválidos }
 *       401: { description: Sessão ausente, expirada ou revogada }
 *       403: { description: Usuário sem `censorship.review` }
 *       404: { description: Denúncia não encontrada }
 *       409: { description: Campo sem conteúdo censurado para revisão }
 */
router.patch('/:id/censura', auth, requirePermission(PERMISSIONS.CENSORSHIP_REVIEW), async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.revisarCensura(
      req.params.id, req.body.field, req.body.manterCensura
    ));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}/resolucao:
 *   patch:
 *     summary: Atualiza o progresso da resolução
 *     description: Exige a permissão `resolution.update`. Administradores legados permanecem autorizados temporariamente.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resolucaoStatus]
 *             properties:
 *               resolucaoStatus: { type: string, enum: [aberta, em_andamento, resolvida] }
 *               setorResponsavel: { type: string, maxLength: 120 }
 *     responses:
 *       200: { description: Andamento atualizado ou nenhuma alteração necessária }
 *       400: { description: Status ou setor inválido }
 *       403: { description: Usuário sem `resolution.update` }
 *       404: { description: Denúncia não encontrada }
 */
router.patch('/:id/resolucao', auth, requirePermission(PERMISSIONS.RESOLUTION_UPDATE), async (req, res, next) => {
  try {
    res.status(200).json(
      await DenunciaService.atualizarResolucao(req.params.id, req.body.resolucaoStatus, req.body, req.user.id)
    );
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia:
 *   get:
 *     summary: Lista denúncias
 *     tags: [Denúncias]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50 }
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const filterKeys = ['titulo', 'descricao', 'localizacao', 'user', 'sort', 'categoria', 'resolucaoStatus'];
    const hasFilters = filterKeys.some(key => req.query[key] !== undefined);
    const { hasPagination, page, limit } = pagination(req);
    const result = hasFilters || hasPagination
      ? await DenunciaService.getFiltered({ ...Object.fromEntries(filterKeys.map(key => [key, req.query[key]])), page, limit }, req.user)
      : await DenunciaService.listarPublicadas();
    res.set('Deprecation-Notice', 'Use GET /denuncia; GET /denuncia/filter será removido em versão futura.');
    res.status(200).json(result);
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/moderacao:
 *   get:
 *     summary: Consulta a fila de moderação
 *     description: Exige `moderation.view`. Os textos originais censurados são incluídos somente com `censorship.review`.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [pendente, aprovada, rejeitada] } }
 *       - { in: query, name: categoria, schema: { type: string } }
 *       - { in: query, name: resolucaoStatus, schema: { type: string, enum: [aberta, em_andamento, resolvida] } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50 } }
 *     responses:
 *       200: { description: Denúncias disponíveis para análise }
 *       400: { description: Filtro inválido }
 *       401: { description: Sessão ausente, expirada ou revogada }
 *       403:
 *         description: Usuário sem `moderation.view`
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/moderacao', auth, requirePermission(PERMISSIONS.MODERATION_VIEW), async (req, res, next) => {
  try {
    const { hasPagination, page, limit } = pagination(req);
    const { status, categoria, resolucaoStatus } = req.query;
    if (status && !['pendente', 'aprovada', 'rejeitada'].includes(status)) throw new AppError('Status de moderação inválido.', 400, 'VALIDATION_ERROR');
    const result = await DenunciaService.listarTodas({ status, categoria, resolucaoStatus, ...(hasPagination ? { page, limit } : {}) }, req.user);
    res.status(200).json(result);
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/filter:
 *   get:
 *     summary: Lista denúncias com filtros
 *     tags: [Denúncias]
 */
router.get('/filter', optionalAuth, async (req, res, next) => {
  try {
    const { titulo, descricao, localizacao, user, sort, categoria, status, resolucaoStatus } = req.query;
    const { hasPagination, page, limit } = pagination(req);
    if (status && status !== 'aprovada') throw new AppError('A consulta pública permite apenas denúncias aprovadas.', 400, 'INVALID_PUBLIC_STATUS');
    const result = await DenunciaService.getFiltered({
      titulo, descricao, localizacao, user, sort, categoria, resolucaoStatus,
      ...(hasPagination ? { page, limit } : {})
    }, req.user);
    res.status(200).json(result);
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/public/user/{userId}:
 *   get:
 *     summary: Lista denúncias públicas de um usuário
 *     tags: [Denúncias]
 *     security: []
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: integer } }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50 } }
 *     responses:
 *       200: { description: Página de denúncias aprovadas }
 */
router.get('/public/user/:userId', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 12);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50 || !Number.isSafeInteger((page - 1) * limit)) {
    throw new AppError('Informe page inteiro positivo e limit entre 1 e 50.', 400, 'VALIDATION_ERROR');
  }
    res.status(200).json(await DenunciaService.buscarPublicadasPorUsuario(req.params.userId, { page, limit }));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/user/{userId}:
 *   get:
 *     summary: Lista denúncias privadas de um usuário
 *     description: Acesso permitido ao próprio usuário ou a quem possui `moderation.view`.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Denúncias do usuário }
 *       403: { description: Tentativa de consultar denúncias privadas de outro usuário }
 */
router.get('/user/:userId', auth, async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.MODERATION_VIEW) && Number(req.user.id) !== Number(req.params.userId)) {
      throw new AppError('Acesso negado.', 403, 'FORBIDDEN');
    }
    res.status(200).json(await DenunciaService.buscarPorUsuario(req.params.userId));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}/historico:
 *   get:
 *     summary: Consulta o histórico de uma denúncia
 *     description: Denúncias públicas podem ser consultadas sem login. O histórico privado exige autoria ou `denuncia.audit.view`.
 *     tags: [Denúncias]
 *     security: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Histórico cronológico da denúncia }
 *       403: { description: Usuário sem acesso ao conteúdo privado }
 *       404: { description: Denúncia não encontrada }
 */
router.get('/:id/historico', optionalAuth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.buscarHistorico(req.params.id, req.user));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}:
 *   get:
 *     summary: Consulta os detalhes de uma denúncia
 *     description: Denúncias aprovadas são públicas; denúncias não aprovadas exigem autoria ou `moderation.view`. Textos originais censurados exigem `censorship.review`.
 *     tags: [Denúncias]
 *     security: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Detalhes da denúncia }
 *       403: { description: Usuário sem acesso ao conteúdo privado }
 *       404: { description: Denúncia não encontrada }
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.buscarPorId(req.params.id, req.user));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}:
 *   put:
 *     summary: Atualiza uma denúncia do usuário autenticado
 *     description: Exige a permissão `denuncia.update_own` e autoria da denúncia.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               titulo: { type: string }
 *               descricao: { type: string }
 *               localizacao: { type: string }
 *               bairro: { type: string, maxLength: 120 }
 *               categoria: { type: string }
 *               imagens: { type: array, maxItems: 4, items: { type: string, format: binary } }
 *               removeImages: { type: boolean }
 *     responses:
 *       200: { description: Denúncia atualizada e reenviada para moderação }
 *       403: { description: Usuário não é o autor }
 *       404: { description: Denúncia não encontrada }
 */
router.put('/:id', auth, requirePermission(PERMISSIONS.DENUNCIA_UPDATE_OWN), upload.array('imagens', 4), async (req, res, next) => {
  let newUrls = [];
  let saved = false;
  try {
    const current = await DenunciaService.buscarPorId(req.params.id, req.user);
    if (Number(current.userId) !== Number(req.user.id)) throw new AppError('Acesso negado.', 403, 'FORBIDDEN');
    if (current.status !== 'rejeitada') throw new AppError('Apenas registros rejeitados podem ser editados.', 409, 'INVALID_STATUS');
    validateDenuncia(req.body, { partial: true });
    if ('imageUrl' in req.body || 'imageUrls' in req.body) throw new AppError('Use o upload de imagens.', 400, 'INVALID_IMAGE_REFERENCE');
    newUrls = await storeImages(req.files || []);
    const removeRequested = req.body.removeImages === true || req.body.removeImages === 'true' || req.body.removeImage === 'true' || req.body.removeImage === true;
    const replaceImages = newUrls.length > 0 || removeRequested;
    const data = { ...req.body };
    delete data.removeImages;
    delete data.removeImage;
    if (replaceImages) {
      data.imageUrls = newUrls;
      data.imageUrl = newUrls[0] || null;
    }
    const result = await DenunciaService.atualizar(req.params.id, data, req.user.id, { uploadedImages: true });
    saved = true;
    if (replaceImages) await Promise.all(
      (current.imageUrls?.length ? current.imageUrls : [current.imageUrl])
        .filter(Boolean)
        .map(url => deleteImage(url).catch(() => {}))
    );
    res.status(200).json(result);
  } catch (error) { if (!saved) await Promise.all(newUrls.map(url => deleteImage(url).catch(() => {}))); next(error); }
});

/**
 * @swagger
 * /denuncia/{id}:
 *   delete:
 *     summary: Exclui uma denúncia do próprio usuário
 *     description: Exige a permissão `denuncia.delete_own` e autoria da denúncia.
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Denúncia excluída }
 *       403: { description: Usuário não é o autor }
 *       404: { description: Denúncia não encontrada }
 */
router.delete('/:id', auth, requirePermission(PERMISSIONS.DENUNCIA_DELETE_OWN), async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.deletar(req.params.id, req.user.id));
  } catch (error) { next(error); }
});

module.exports = router;
