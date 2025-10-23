const express = require('express')
const router = express.Router()
const ShareService = require('../services/ShareService')

/**
 * @swagger
 * tags:
 *   name: Compartilhamentos
 *   description: Endpoints para compartilhar denúncias
 */

/**
 * @swagger
 * /denuncia/{id}/share:
 *   post:
 *     summary: Compartilha uma denúncia
 *     tags: [Compartilhamentos]
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
 *                 example: 5
 *               comentario:
 *                 type: string
 *                 example: Concordo, já vi esse problema!
 *     responses:
 *       201:
 *         description: Denúncia compartilhada
 *       404:
 *         description: Usuário ou denúncia não encontrada
 */

// Compartilha denúncia
router.post('/denuncia/:id/share', async (req, res) => {
  try {
    const { userId, comentario } = req.body
    const denunciaId = req.params.id
    const result = await ShareService.compartilhar({ userId, denunciaId, comentario })
    // service returns { message, share }
    res.status(201).json(result)
  } catch (error) {
    if (error.message && (error.message.includes('Usuário') || error.message.includes('Denúncia'))) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /denuncia/{id}/shares:
 *   get:
 *     summary: Lista os compartilhamentos de uma denúncia
 *     tags: [Compartilhamentos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de compartilhamentos
 */

// Lista compartilhamentos
router.get('/denuncia/:id/shares', async (req, res) => {
  try {
    const shares = await ShareService.listarPorDenuncia(req.params.id)
    res.status(200).json(shares)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /shares/{id}:
 *   delete:
 *     summary: Deleta um compartilhamento
 *     tags: [Compartilhamentos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compartilhamento removido
 *       404:
 *         description: Compartilhamento não encontrado
 */

// Deleta compartilhamento
router.delete('/shares/:id', async (req, res) => {
  try {
    const result = await ShareService.deletar(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    if (error.message && error.message.includes('Compartilhamento não encontrado')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
