const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const requirePermission = require('../middlewares/requirePermission');
const optionalAuth = require('../middlewares/optionalAuth');
const AppError = require('../utils/AppError');
const DenunciaService = require('../services/DenunciaService');
const { upload, storeImage, deleteImage } = require('../utils/upload');
const { PERMISSIONS } = require('../constants/accessControl');

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
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/moderar', auth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.moderar(req.params.id, req.body.status, req.user.adm, req.body.motivoRejeicao, req.user.id));
  } catch (error) { next(error); }
});

router.patch('/:id/censura', auth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.revisarCensura(
      req.params.id, req.body.field, req.body.manterCensura, req.user.adm
    ));
  } catch (error) { next(error); }
});

/**
 * @swagger
 * /denuncia/{id}/resolucao:
 *   patch:
 *     summary: Atualiza o progresso da resolução
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/resolucao', auth, async (req, res, next) => {
  try {
    res.status(200).json(
      await DenunciaService.atualizarResolucao(req.params.id, req.body.resolucaoStatus, req.user.adm, req.body, req.user.id)
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

router.get('/moderacao', auth, requirePermission(PERMISSIONS.MODERATION_VIEW), async (req, res, next) => {
  try {
    const { hasPagination, page, limit } = pagination(req);
    const { status, categoria, resolucaoStatus } = req.query;
    if (status && !['pendente', 'aprovada', 'rejeitada'].includes(status)) throw new AppError('Status de moderação inválido.', 400, 'VALIDATION_ERROR');
    const result = await DenunciaService.listarTodas({ status, categoria, resolucaoStatus, ...(hasPagination ? { page, limit } : {}) });
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

router.get('/public/user/:userId', async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '12', 10), 1), 50);
    res.status(200).json(await DenunciaService.buscarPublicadasPorUsuario(req.params.userId, { page, limit }));
  } catch (error) { next(error); }
});

router.get('/user/:userId', auth, async (req, res, next) => {
  try {
    if (!req.user.adm && Number(req.user.id) !== Number(req.params.userId)) {
      throw new AppError('Acesso negado.', 403, 'FORBIDDEN');
    }
    res.status(200).json(await DenunciaService.buscarPorUsuario(req.params.userId));
  } catch (error) { next(error); }
});

router.get('/:id/historico', optionalAuth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.buscarHistorico(req.params.id, req.user));
  } catch (error) { next(error); }
});

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.buscarPorId(req.params.id, req.user));
  } catch (error) { next(error); }
});

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

router.delete('/:id', auth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.deletar(req.params.id, req.user.id));
  } catch (error) { next(error); }
});

module.exports = router;
