const express = require('express')
const router = express.Router()
const ShareService = require('../services/ShareService')
const auth = require('../middlewares/auth')

/**
 * @swagger
 * tags:
 *   name: Compartilhamentos
 *   description: Endpoints para compartilhar denúncias
 */

/**
 * @swagger
 * /denuncia/{denunciaId}/share:
 *   post:
 *     summary: Compartilha uma denúncia com comentário opcional
 *     tags: [Compartilhamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia a ser compartilhada
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comentario:
 *                 type: string
 *                 example: "Denúncia importante, vamos divulgar!"
 *     responses:
 *       201:
 *         description: Denúncia compartilhada com sucesso
 *       400:
 *         description: Erro ao compartilhar
 */

// Compartilha denúncia
router.post('/:denunciaId/share',auth, async (req, res, next) => {
  try {
    const { comentario } = req.body
    const result = await ShareService.compartilhar({ denunciaId: req.params.denunciaId, comentario }, req.user)
    res.status(201).json(result)
  } catch (error) { next(error) }
})

/**
 * @swagger
 * /denuncia/{denunciaId}/shares:
 *   get:
 *     summary: Lista todos os compartilhamentos de uma denúncia
 *     tags: [Compartilhamentos]
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de compartilhamentos retornada
 */

// Lista compartilhamentos de uma denúncia
router.get('/:denunciaId/shares', async (req, res, next) => {
  try {
    const page = req.query.page ? Math.max(Number(req.query.page), 1) : null
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : null
    const shares = await ShareService.listarPorDenuncia(req.params.denunciaId, { page, limit })
    res.status(200).json(shares)
  } catch (error) { next(error) }
})

/**
 * @swagger
 * /denuncia/share/{id}:
 *   delete:
 *     summary: Remove um compartilhamento
 *     tags: [Compartilhamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do compartilhamento
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compartilhamento removido com sucesso
 *       403:
 *         description: Usuário sem permissão
 *       404:
 *         description: Compartilhamento não encontrado
 */

// Deleta compartilhamento
router.delete('/share/:id',auth, async (req, res, next) => {
  try {
    const result = await ShareService.deletar(req.params.id, req.user.id)
    res.status(200).json(result)
  } catch (error) { next(error) }
})

module.exports = router
