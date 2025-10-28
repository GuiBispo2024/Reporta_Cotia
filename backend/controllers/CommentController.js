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
 * /denuncia/comentario:
 *   post:
 *     summary: Cria um novo comentário em uma denúncia
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []       
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texto
 *               - denunciaId
 *             properties:
 *               texto:
 *                 type: string
 *                 example: Concordo totalmente com essa denúncia!
 *               denunciaId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Comentário criado com sucesso
 *       400:
 *         description: Erro ao criar comentário
 *       404:
 *         description: Usuário ou denúncia não encontrada
 */

// Cria comentário
router.post('/comentario',auth, async (req, res) => {
   try {
    const result = await CommentService.create(req.body, req.user)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}) 

/**
 * @swagger
 * /denuncia/comentarios/{id}:
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
 *       500:
 *         description: Erro interno ao buscar comentários
 */

// Lista comentários de uma denúncia
router.get('/comentarios/:id', async (req, res) => {
  try {
    const comentarios = await CommentService.listarPorDenuncia(req.params.id)
    res.status(200).json(comentarios)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /denuncia/comentario/{id}:
 *   put:
 *     summary: Atualiza o texto de um comentário existente
 *     tags: [Comentários]
 *     security:
 *       - bearerAuth: []      
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do comentário a ser atualizado
 *         schema:
 *           type: integer
 *           example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               texto:
 *                 type: string
 *                 example: Atualizei meu comentário após mais informações.
 *     responses:
 *       200:
 *         description: Comentário atualizado com sucesso
 *       403:
 *         description: Você não tem permissão para atualizar este comentário
 *       404:
 *         description: Comentário não encontrado
 */

//Altera um comentário
router.put('/comentario/:id',auth, async (req, res) => {
  try {
    const result = await CommentService.atualizar(req.params, req.body, req.user)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ error: error.message })
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
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do comentário a ser excluído
 *         schema:
 *           type: integer
 *           example: 3
 *     responses:
 *       200:
 *         description: Comentário excluído com sucesso
 *       403:
 *         description: Você não tem permissão para excluir este comentário
 *       404:
 *         description: Comentário não encontrado
 */

// Deleta comentário
router.delete('/comentario/:id',auth, async (req, res) => {
  try {
    const result = await CommentService.deletar(req.params.id, req.user)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ error: error.message })
  }
})

module.exports = router