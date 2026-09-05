const express = require('express')
const router = express.Router()
const LikeService = require('../services/LikeService')
const auth = require('../middlewares/auth')

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Endpoints para curtir e descurtir denúncias
 */

/**
 * @swagger
 * /denuncia/{denunciaId}/like:
 *   post:
 *     summary: Dá like em uma denúncia
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Like registrado com sucesso
 *       400:
 *         description: Usuário já curtiu essa denúncia
 */

// Dá like
router.post('/:denunciaId/like',auth, async (req, res, next) => {
  try {
    const result = await LikeService.curtir({ denunciaId: req.params.denunciaId }, req.user)
    res.status(201).json(result)
  } catch (error) { next(error) }
})

/**
 * @swagger
 * /denuncia/{denunciaId}/likes:
 *   get:
 *     summary: Lista todos os likes de uma denúncia
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de likes retornada
 */

// Lista likes de uma denúncia
router.get('/:denunciaId/likes', async (req, res, next) => {
  try {
    const page = req.query.page ? Math.max(Number(req.query.page), 1) : null
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : null
    const denunciaLikes = await LikeService.listarPorDenuncia(req.params.denunciaId, { page, limit })
    res.status(200).json(denunciaLikes)
  } catch (error) { next(error) }
})

/**
 * @swagger
 * /denuncia/{denunciaId}/like:
 *   delete:
 *     summary: Remove o like de uma denúncia
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Like removido com sucesso
 *       404:
 *         description: Like não encontrado
 */

// Remove like
router.delete('/:denunciaId/like',auth, async (req, res, next) => {
  try {
    const result = await LikeService.descurtir({ denunciaId: req.params.denunciaId }, req.user)
    res.status(200).json(result)
  } catch (error) { next(error) }
})

module.exports = router
