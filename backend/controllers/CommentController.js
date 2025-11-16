const express = require('express')
const router = express.Router()
const CommentService = require('../services/CommentService')
const auth = require('../middlewares/auth')

/**
 * @swagger
 * tags:
 *   name: Comentários
 *   description: Endpoints para criação e gerenciamento de comentários
 */

/**
 * @swagger
 * /denuncia/{denunciaId}/comentario:
 *   post:
 *     summary: Cria um novo comentário em uma denúncia
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia a ser comentada
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               texto:
 *                 type: string
 *                 example: "Essa rua está muito perigosa à noite!"
 *     responses:
 *       201:
 *         description: Comentário criado com sucesso
 *       400:
 *         description: Erro ao criar comentário
 *       401:
 *         description: Usuário não autorizado
 */

// Cria comentário
router.post('/:denunciaId/comentario',auth, async (req, res) => {
   try {
    const { denunciaId } = req.params
    const { texto } = req.body
    const result = await CommentService.create({ texto, denunciaId }, req.user)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}) 

/**
 * @swagger
 * /denuncia/{denunciaId}/comentarios:
 *   get:
 *     summary: Lista todos os comentários de uma denúncia
 *     tags: [Comentários]
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de comentários retornada com sucesso
 */

// Lista comentários de uma denúncia
router.get('/:denunciaId/comentarios', async (req, res) => {
  try {
    const comentarios = await CommentService.listarPorDenuncia(req.params.denunciaId)
    res.status(200).json(comentarios)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia/comentario/{id}:
 *   put:
 *     summary: Atualiza um comentário existente
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do comentário
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               texto:
 *                 type: string
 *                 example: "Atualizei meu comentário."
 *     responses:
 *       200:
 *         description: Comentário atualizado com sucesso
 *       403:
 *         description: Usuário sem permissão
 *       404:
 *         description: Comentário não encontrado
 */

//Altera um comentário
router.put('/comentario/:id',auth, async (req, res) => {
  try {
    const result = await CommentService.atualizar(req.params.id, req.body, req.user)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia/comentario/{id}:
 *   delete:
 *     summary: Deleta um comentário
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID do comentário
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comentário deletado com sucesso
 *       403:
 *         description: Usuário sem permissão
 *       404:
 *         description: Comentário não encontrado
 */

// Deleta comentário
router.delete('/comentario/:id',auth, async (req, res) => {
  try {
    const result = await CommentService.deletar(req.params.id, req.user.id, req.user.adm)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ message: error.message })
  }
})

module.exports = router