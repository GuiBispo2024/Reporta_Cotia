const express = require('express')
const router = express.Router()
const {User, Denuncia, Comment} = require('../models/rel')
const filterBadWords = require('../utils/filterBadWords')

/**
 * @swagger
 * tags:
 *   name: Comentários
 *   description: Endpoints para criação e gerenciamento de comentários
 */

/**
 * @swagger
 * /comentarios:
 *   post:
 *     summary: Cria um novo comentário em uma denúncia
 *     tags: [Comentários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               texto:
 *                 type: string
 *                 example: Concordo totalmente com essa denúncia!
 *               userId:
 *                 type: integer
 *                 example: 2
 *               denunciaId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Comentário criado com sucesso
 *       404:
 *         description: Usuário ou denúncia não encontrada
 */

// Cria comentário
router.post('/', async (req, res) => {
  try {
    const { texto, userId, denunciaId } = req.body
    const user = await User.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'Usuário não existe' })
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })

    const { hasBadWord, filteredText } = filterBadWords(texto)

    const comentario = await Comment.create({ texto: filteredText, userId, denunciaId })

    res.status(201).json({
      message: hasBadWord
        ? 'Comentário publicado (palavras censuradas)'
        : 'Comentário publicado com sucesso',
      comentario
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /comentarios/denuncia/{id}:
 *   get:
 *     summary: Lista todos os comentários de uma denúncia
 *     tags: [Comentários]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de comentários
 */

// Lista comentários de uma denúncia
router.get('/denuncia/:id', async (req, res) => {
  try {
    const comentarios = await Comment.findAll({
      where: { denunciaId: req.params.id },
      include: { model: User, attributes: ['id', 'username'] }
    })
    res.status(200).json(comentarios)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /comentarios/{id}:
 *   delete:
 *     summary: Deleta um comentário
 *     tags: [Comentários]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comentário excluído
 *       404:
 *         description: Comentário não encontrado
 */

// Deleta comentário
router.delete('/:id', async (req, res) => {
  try {
    const rows = await Comment.destroy({ where: { id: req.params.id } })
    if (!rows) return res.status(404).json({ message: 'Comentário não encontrado' })
    res.status(200).json({ message: 'Comentário excluído com sucesso' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router