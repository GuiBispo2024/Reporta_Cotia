const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optionalAuth');
const AppError = require('../utils/AppError');
const DenunciaService = require('../services/DenunciaService');
const { upload, storeImage } = require('../utils/upload');

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
router.post('/', auth, upload.single('imagem'), async (req, res, next) => {
  try {
    const imageUrl = await storeImage(req.file);
    res.status(201).json(await DenunciaService.create({ ...req.body, imageUrl }, req.user));
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
    res.status(200).json(await DenunciaService.moderar(req.params.id, req.body.status, req.user.adm, req.body.motivoRejeicao));
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
      await DenunciaService.atualizarResolucao(req.params.id, req.body.resolucaoStatus, req.user.adm)
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
router.get('/', async (req, res, next) => {
  try {
    const { hasPagination, page, limit } = pagination(req);
    const result = await DenunciaService.listarPublicadas(hasPagination ? { page, limit } : {});
    res.status(200).json(result);
  } catch (error) { next(error); }
});

router.get('/moderacao', auth, async (req, res, next) => {
  try {
    if (!req.user.adm) throw new AppError('Acesso negado.', 403, 'FORBIDDEN');
    const { hasPagination, page, limit } = pagination(req);
    const result = await DenunciaService.listarTodas(hasPagination ? { page, limit } : {});
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
router.get('/filter', async (req, res, next) => {
  try {
    const { titulo, descricao, localizacao, user, sort, categoria, status, resolucaoStatus } = req.query;
    const { hasPagination, page, limit } = pagination(req);
    const result = await DenunciaService.getFiltered({
      titulo, descricao, localizacao, user, sort, categoria, status, resolucaoStatus,
      ...(hasPagination ? { page, limit } : {})
    });
    res.status(200).json(result);
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

router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.buscarPorId(req.params.id, req.user));
  } catch (error) { next(error); }
});

router.put('/:id', auth, upload.single('imagem'), async (req, res, next) => {
  try {
    const imageUrl = req.file
      ? await storeImage(req.file)
      : req.body.removeImage === 'true' || req.body.removeImage === true
        ? null
        : undefined;
    const data = { ...req.body };
    delete data.removeImage;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    res.status(200).json(await DenunciaService.atualizar(req.params.id, data, req.user.id));
  } catch (error) { next(error); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    res.status(200).json(await DenunciaService.deletar(req.params.id, req.user.id));
  } catch (error) { next(error); }
});

module.exports = router;
