const express = require('express')
const router = express.Router()
const CommentService = require('../services/CommentService')

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
    const result = await CommentService.create({ texto, userId, denunciaId })
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
    const comentarios = await CommentService.listarPorDenuncia(req.params.id)
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
    const result = await CommentService.deletar(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    if (error.message && error.message.includes('Comentário não encontrado')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router