const express = require('express')
const router = express.Router()
const LikeService = require('../services/LikeService')
const auth = require('../middlewares/auth')

/**
 * @swagger
 * tags:
 *   name: Curtidas
 *   description: Endpoints para curtir e descurtir denúncias
 */

/**
 * @swagger
 * /denuncia/{id}/like:
 *   post:
 *     summary: Dá like em uma denúncia
 *     tags: [Curtidas]
 *     security:
 *       - bearerAuth: []       
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID da denúncia que será curtida
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       201:
 *         description: Curtida registrada com sucesso
 *       400:
 *         description: Usuário já curtiu esta denúncia
 *       404:
 *         description: Usuário ou denúncia não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

// Dá like
router.post('/:id/like',auth, async (req, res) => {
  try {
    const denunciaId = req.params.id
    const userId = req.user.id

    const result = await LikeService.curtir({ userId, denunciaId })
    res.status(201).json(result)
  } catch (error) {
    if (error.message.includes('Usuário já curtiu')) {
      return res.status(400).json({ error: error.message })
    }
    if (error.message.includes('Usuário') || error.message.includes('Denúncia')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /denuncia/{id}/like:
 *   delete:
 *     summary: Remove o like de uma denúncia
 *     tags: [Curtidas]
 *     security:
 *       - bearerAuth: []       
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID da denúncia cujo like será removido
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Like removido com sucesso
 *       404:
 *         description: Like não encontrado
 *       500:
 *         description: Erro interno do servidor
 */

// Remove like
router.delete('/:id/like',auth, async (req, res) => {
  try {
    const denunciaId = req.params.id
    const userId = req.user.id
    const result = await LikeService.descurtir({ userId, denunciaId })
    res.status(200).json(result)
  } catch (error) {
    if (error.message.includes('Like não encontrado')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /denuncia/{id}/likes:
 *   get:
 *     summary: Lista todos os usuários que curtiram uma denúncia
 *     tags: [Curtidas]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Lista de curtidas da denúncia
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 10
 *                   userId:
 *                     type: integer
 *                     example: 3
 *                   denunciaId:
 *                     type: integer
 *                     example: 1
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Denúncia não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

// Lista likes de uma denúncia
router.get('/:id/likes', async (req, res) => {
  try {
    const denunciaLikes = await LikeService.listarPorDenuncia(req.params.id)
    res.status(200).json(denunciaLikes)
  } catch (error) {
    if (error.message && error.message.includes('Denúncia não encontrada')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router