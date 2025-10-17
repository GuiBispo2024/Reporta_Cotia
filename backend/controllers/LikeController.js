const express = require('express')
const router = express.Router()
const {User, Denuncia, Like} = require('../models/rel')

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

    const user = await User.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'Usuário não existe' })
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })

    const [like, created] = await Like.findOrCreate({ where: { userId, denunciaId } })
    if (!created) return res.status(400).json({ message: 'Usuário já curtiu essa denúncia' })

    res.status(201).json({ message: 'Curtida registrada' })
  } catch (error) {
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
    const rows = await Like.destroy({ where: { userId, denunciaId: req.params.id } })
    if (!rows) return res.status(404).json({ message: 'Like não encontrado' })
    res.status(200).json({ message: 'Like removido' })
  } catch (error) {
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
    const denuncia = await Denuncia.findByPk(req.params.id, {
      include: { model: User, attributes: ['id', 'username'] }
    })
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })
    res.status(200).json({ totalLikes: denuncia.likes.length, usuarios: denuncia.likes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router