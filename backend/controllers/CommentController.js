const express = require('express')
const router = express.Router()
const CommentService = require('../services/CommentService')
const auth = require('../middlewares/auth')
const optionalAuth = require('../middlewares/optionalAuth')
const requirePermission = require('../middlewares/requirePermission')
const { PERMISSIONS } = require('../constants/accessControl')

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
 *               parentCommentId:
 *                 type: integer
 *                 nullable: true
 *                 description: Comentário respondido. Somente um nível de resposta é permitido.
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
 *     description: Endpoint público. Usuários administrativos autenticados também recebem o conteúdo original pendente de revisão.
 *     tags: [Comentários]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: denunciaId
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50 } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest], default: newest } }
 *     responses:
 *       200:
 *         description: Lista de comentários retornada com sucesso
 */

// Lista comentários de uma denúncia
router.get('/:denunciaId/comentarios', optionalAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Math.max(Number(req.query.page), 1) : null
    const limit = req.query.limit ? Math.min(Math.max(Number(req.query.limit), 1), 50) : null
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest'
    const canReviewCensorship = Boolean(req.user?.adm || req.user?.permissions?.includes(PERMISSIONS.CENSORSHIP_REVIEW))
    const comentarios = await CommentService.listarPorDenuncia(req.params.denunciaId, canReviewCensorship, { page, limit, sort })
    res.status(200).json(comentarios)
  } catch (error) { next(error) }
})

/**
 * @swagger
 * /denuncia/comentario/{id}/censura:
 *   patch:
 *     summary: Revisa a censura automática de um comentário
 *     description: Permite manter ou retirar a censura antes de encerrar a revisão. Exige `censorship.review`; administradores legados permanecem autorizados temporariamente.
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [manterCensura]
 *             properties:
 *               manterCensura: { type: boolean }
 *     responses:
 *       200: { description: Decisão de censura registrada }
 *       400: { description: Comentário ou decisão inválidos }
 *       401: { description: Sessão ausente, expirada ou revogada }
 *       403: { description: Usuário sem `censorship.review` }
 */
router.patch('/comentario/:id/censura', auth, requirePermission(PERMISSIONS.CENSORSHIP_REVIEW), async (req, res, next) => {
  try {
    res.status(200).json(await CommentService.revisarCensura(req.params.id, req.body.manterCensura))
  } catch (error) { next(error) }
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
    const canModerateContent = Boolean(req.user.adm || req.user.permissions?.includes(PERMISSIONS.CENSORSHIP_REVIEW))
    const result = await CommentService.deletar(req.params.id, req.user.id, canModerateContent)
    res.status(200).json(result)
  } catch (error) { next(error) }
})

module.exports = router
