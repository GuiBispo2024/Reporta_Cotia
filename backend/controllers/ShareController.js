const express = require('express')
const router = express.Router()
const ShareService = require('../services/ShareService')
const auth = require('../middlewares/auth')

/**
 * @swagger
 * tags:
 *   name: Compartilhamentos
 *   description: Endpoints para compartilhar denúncias
 */

/**
 * @swagger
 * /denuncia/share/{id}:
 *   post:
 *     summary: Compartilha uma denúncia
 *     tags: [Compartilhamentos]
 *     security:
 *       - bearerAuth: []       
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID da denúncia a ser compartilhada
 *         schema:
 *           type: integer
 *           example: 2
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comentario:
 *                 type: string
 *                 example: Concordo totalmente com essa denúncia, deve ser resolvida logo!
 *     responses:
 *       201:
 *         description: Denúncia compartilhada com sucesso
 *       404:
 *         description: Usuário ou denúncia não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

// Compartilha denúncia
router.post('/share/:id',auth, async (req, res) => {
  try {
    const result = await ShareService.compartilhar(req.params, req.body, req.user)
    res.status(201).json(result)
  } catch (error) {
    if (error.message.includes('Usuário') || error.message.includes('Denúncia')) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /denuncia/shares/{id}:
 *   get:
 *     summary: Lista todos os compartilhamentos de uma denúncia
 *     tags: [Compartilhamentos]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID da denúncia
 *         schema:
 *           type: integer
 *           example: 2
 *     responses:
 *       200:
 *         description: Lista de compartilhamentos da denúncia
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 15
 *                   userId:
 *                     type: integer
 *                     example: 5
 *                   denunciaId:
 *                     type: integer
 *                     example: 2
 *                   comentario:
 *                     type: string
 *                     example: Esse problema já acontece há meses aqui.
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Denúncia não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

// Lista compartilhamentos de uma denúncia
router.get('/shares/:id', async (req, res) => {
  try {
    const shares = await ShareService.listarPorDenuncia(req.params.id)
    res.status(200).json(shares)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /denuncia/share/{id}:
 *   delete:
 *     summary: Deleta um compartilhamento
 *     tags: [Compartilhamentos]
 *     security:
 *       - bearerAuth: []       
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do compartilhamento a ser deletado
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Compartilhamento removido com sucesso
 *       403:
 *         description: Você não tem permissão para deletar este compartilhamento
 *       404:
 *         description: Compartilhamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */

// Deleta compartilhamento
router.delete('/share/:id',auth, async (req, res) => {
  try {
    const result = await ShareService.deletar(req.params, req.user)
    res.status(200).json(result)
  } catch (error) {
    if (error.message.includes('Compartilhamento não encontrado')) {
      return res.status(404).json({ error: error.message })
    }
    if (error.message.includes('permissão')) {
      return res.status(403).json({ error: error.message })
    }
    res.status(500).json({ error: error.message })
  }
})

module.exports = router