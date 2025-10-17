const express = require('express')
const router = express.Router()
const {User, Denuncia, Share} = require('../models/rel')
const { filterBadWords } = require('../utils/filterBadWords')

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

    const user = await User.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'Usuário não existe' })
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })
    const { hasBadWord, filteredText } = filterBadWords(comentario)
    const share = await Share.create({ userId, denunciaId, comentario:filteredText })
    res.status(201).json({
      message: hasBadWord
        ? 'Denúncia compartilhada (comentário censurado)'
        : 'Denúncia compartilhada com sucesso',
      share
    })
  } catch (error) {
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
    const shares = await Share.findAll({
      where: { denunciaId: req.params.id },
      include: { model: User, attributes: ['id', 'username'] }
    })
    res.status(200).json({ totalShares: shares.length, shares })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
