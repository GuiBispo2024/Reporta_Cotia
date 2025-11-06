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
router.post('/:denunciaId/like',auth, async (req, res) => {
  try {
    const result = await LikeService.curtir({ denunciaId: req.params.denunciaId }, req.user)
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
router.get('/:denunciaId/likes', async (req, res) => {
  try {
    const denunciaLikes = await LikeService.listarPorDenuncia(req.params.denunciaId)
    res.status(200).json(denunciaLikes)
  } catch (error) {
    if (error.message.includes('Denúncia não encontrada')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
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
router.delete('/:id/like',auth, async (req, res) => {
  try {
    const result = await LikeService.descurtir({ denunciaId: req.params.denunciaId }, req.user)
    res.status(200).json(result)
  } catch (error) {
    if (error.message.includes('Like não encontrado')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router