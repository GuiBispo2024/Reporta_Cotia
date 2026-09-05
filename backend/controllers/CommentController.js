const express = require('express')
const router = express.Router()
const CommentService = require('../services/CommentService')
const auth = require('../middlewares/auth')
const optionalAuth = require('../middlewares/optionalAuth')

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
 *               comentario:
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
router.post('/:denunciaId/comentario',auth, async (req, res, next) => {
   try {
    const { denunciaId } = req.params
    const { comentario, parentCommentId } = req.body
    const result = await CommentService.create({ comentario, denunciaId, parentCommentId }, req.user)
    res.status(201).json({comentario: result.Comentario})
  } catch (error) { next(error) }
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
router.get('/:denunciaId/comentarios', optionalAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Math.max(Number(req.query.page), 1) : null
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : null
    const comentarios = await CommentService.listarPorDenuncia(req.params.denunciaId, Boolean(req.user?.adm), { page, limit })
    res.status(200).json(comentarios)
  } catch (error) { next(error) }
})

router.patch('/comentario/:id/censura', auth, async (req, res) => {
  try {
    res.status(200).json(await CommentService.revisarCensura(req.params.id, req.body.manterCensura, req.user.adm))
  } catch (error) {
    res.status(error.message.includes('Apenas administradores') ? 403 : 400).json({ message: error.message })
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
 *               comentario:
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
router.put('/comentario/:id',auth, async (req, res, next) => {
  try {
    const result = await CommentService.atualizar(req.params.id, req.body, req.user.id)
    res.status(200).json(result)
  } catch (error) { next(error) }
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
router.delete('/comentario/:id',auth, async (req, res, next) => {
  try {
    const result = await CommentService.deletar(req.params.id, req.user.id, req.user.adm)
    res.status(200).json(result)
  } catch (error) { next(error) }
})

module.exports = router
