const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const requirePermission = require('../middlewares/requirePermission');
const optionalAuth = require('../middlewares/optionalAuth');
const AppError = require('../utils/AppError');
const DenunciaService = require('../services/DenunciaService');
const { upload, storeImage, deleteImage } = require('../utils/upload');
const { PERMISSIONS } = require('../constants/accessControl');
const { hasPermission } = require('../utils/authorization');

function pagination(req) {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '12', 10), 1), 50);
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
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', auth, upload.array('imagens', 4), async (req, res, next) => {
  try {
    const imageUrls = await Promise.all((req.files || []).map(file => storeImage(file)));
    res.status(201).json(await DenunciaService.create({ ...req.body, imageUrls, imageUrl: imageUrls[0] || null }, req.user));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}/moderar:
 *   patch:
 *     summary: Aprova ou rejeita uma denúncia
 *     description: Exige a permissão `moderation.review`. Ao rejeitar, o motivo é obrigatório e fica disponível ao autor. Administradores legados permanecem autorizados temporariamente.
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
 *     description: Permite manter ou retirar a censura do título ou da descrição. Exige `censorship.review`; administradores legados permanecem autorizados temporariamente.
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
 *     description: Exige `moderation.view`. Os textos originais censurados são incluídos somente com `censorship.review`. Administradores legados permanecem autorizados temporariamente.
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
    const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '12', 10), 1), 50);
    res.status(200).json(await DenunciaService.buscarPublicadasPorUsuario(req.params.userId, { page, limit }));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/user/{userId}:
 *   get:
 *     summary: Lista denúncias privadas de um usuário
 *     description: Acesso permitido ao próprio usuário ou a quem possui `moderation.view`. Administradores legados permanecem autorizados temporariamente.
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
 *     description: Denúncias públicas podem ser consultadas sem login. O histórico privado exige autoria ou `audit.view`.
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
 *               categoria: { type: string }
 *               imagens: { type: array, maxItems: 4, items: { type: string, format: binary } }
 *               removeImages: { type: boolean }
 *     responses:
 *       200: { description: Denúncia atualizada e reenviada para moderação }
 *       403: { description: Usuário não é o autor }
 *       404: { description: Denúncia não encontrada }
 */
router.put('/:id', auth, upload.array('imagens', 4), async (req, res, next) => {
  try {
    const current = await DenunciaService.buscarPorId(req.params.id, req.user);
    const newUrls = await Promise.all((req.files || []).map(file => storeImage(file)));
    const removeRequested = req.body.removeImages === 'true' || req.body.removeImage === 'true' || req.body.removeImage === true;
    const replaceImages = newUrls.length > 0 || removeRequested;
    const data = { ...req.body };
    delete data.removeImages;
    delete data.removeImage;
    if (replaceImages) {
      data.imageUrls = newUrls;
      data.imageUrl = newUrls[0] || null;
    }
    const result = await DenunciaService.atualizar(req.params.id, data, req.user.id);
    if (replaceImages) await Promise.all(
      (current.imageUrls?.length ? current.imageUrls : [current.imageUrl])
        .filter(Boolean)
        .map(url => deleteImage(url).catch(() => {}))
    );
    res.status(200).json(result);
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}:
 *   delete:
 *     summary: Exclui uma denúncia do próprio usuário
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
router.delete('/:id', auth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.deletar(req.params.id, req.user.id));
  } catch (error) { next(error); }
});

module.exports = router;
