const express = require('express')
const router = express.Router()
const LikeService = require('../services/LikeService')

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
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Curtida registrada
 *       400:
 *         description: Usuário já curtiu
 *       404:
 *         description: Usuário ou denúncia não encontrada
 */

// Dá like
router.post('/denuncia/:id/like', async (req, res) => {
  try {
    const { userId } = req.body
    const denunciaId = req.params.id

    const result = await LikeService.curtir({ userId, denunciaId })
    res.status(201).json(result)
  } catch (error) {
    if (error.message && error.message.includes('Usuário já curtiu')) {
      return res.status(400).json({ error: error.message })
    }
    if (error.message && (error.message.includes('Usuário') || error.message.includes('Denúncia'))) {
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
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Like removido
 *       404:
 *         description: Like não encontrado
 */

// Remove like
router.delete('/denuncia/:id/like', async (req, res) => {
  try {
    const { userId } = req.body
    const denunciaId = req.params.id
    const result = await LikeService.descurtir({ userId, denunciaId })
    res.status(200).json(result)
  } catch (error) {
    if (error.message && error.message.includes('Like não encontrado')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /denuncia/{id}/likes:
 *   get:
 *     summary: Lista os likes de uma denúncia
 *     tags: [Curtidas]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de usuários que curtiram
 */

// Lista likes de uma denúncia
router.get('/denuncia/:id/likes', async (req, res) => {
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