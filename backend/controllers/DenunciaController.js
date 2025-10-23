const express = require('express')
const router = express.Router()
const auth = require('../middlewares/auth')
const DenunciaService = require('../services/DenunciaService')

/**
 * @swagger
 * tags:
 *   name: Denúncias
 *   description: Endpoints para gerenciamento de denúncias
 */

/**
 * @swagger
 * /:
 *   post:
 *     summary: Cria uma nova denúncia
 *     description: Envia uma denúncia que será salva com status "pendente" até ser moderada por um administrador.
 *     tags: [Denúncias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: Buraco na rua principal
 *               descricao:
 *                 type: string
 *                 example: Buraco grande em frente à escola municipal
 *               localizacao:
 *                 type: string
 *                 example: Rua das Flores, nº 120
 *               userId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Denúncia enviada com sucesso
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */

//Posta uma denúncia
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const result = await DenunciaService.create({ ...req.body, userId })
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * @swagger
 * /{id}/moderar:
 *   patch:
 *     summary: Modera uma denúncia (somente admin)
 *     description: Permite que um usuário com campo "adm" igual a true altere o status de uma denúncia.
 *     tags: [Denúncias]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da denúncia a ser moderada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               status:
 *                 type: string
 *                 enum: [pendente, aprovada, rejeitada]
 *                 example: aprovada
 *     responses:
 *       200:
 *         description: Denúncia moderada com sucesso
 *       400:
 *         description: Status inválido
 *       403:
 *         description: Acesso negado (usuário não é admin)
 *       404:
 *         description: Denúncia ou usuário não encontrado
 */

//Moderação de uma denúncia
router.patch('/:id/moderar', auth, async (req, res) => {
  try {
    const { status } = req.body
    const isAdm = req.user.adm
    const result = await DenunciaService.moderar(req.params.id, status, isAdm)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

/**
 * @swagger
 * /:
 *   get:
 *     summary: Lista todas as denúncias
 *     tags: [Denúncias]
 *     responses:
 *       200:
 *         description: Lista de todas as denúncias
 *       500:
 *         description: Erro interno do servidor
 */

//Lista todas as denúncias
router.get('/', async (req, res) => {
  try {
    const denuncias = await DenunciaService.listarTodas()
    res.status(200).json(denuncias)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /{id}:
 *   get:
 *     summary: Retorna uma denúncia específica
 *     tags: [Denúncias]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Denúncia encontrada
 *       404:
 *         description: Denúncia não encontrada
 */

//Procura uma denúncia específica
router.get('/:id', async (req, res) => {
  try {
    const denuncia = await DenunciaService.buscarPorId(req.params.id)
    res.status(200).json(denuncia)
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Retorna todas as denúncias de um usuário específico
 *     tags: [Denúncias]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de denúncias do usuário
 *       404:
 *         description: Nenhuma denúncia encontrada
 */

//Procura todas as denúncias de um usuário específico
router.get('/user/:userId', async (req, res) => {
  try {
    const denuncias = await DenunciaService.buscarPorUsuario(req.params.userId)
    res.status(200).json(denuncias)
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

/**
 * @swagger
 * /{id}:
 *   put:
 *     summary: Edita uma denúncia existente
 *     tags: [Denúncias]
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
 *               titulo:
 *                 type: string
 *                 example: Novo título
 *               descricao:
 *                 type: string
 *                 example: Nova descrição
 *               localizacao:
 *                 type: string
 *                 example: Nova localização
 *     responses:
 *       200:
 *         description: Denúncia atualizada
 *       404:
 *         description: Denúncia não encontrada
 */

//Edita uma denúncia
router.put('/:id', async (req, res) => {
  try {
    const result = await DenunciaService.atualizar(req.params.id, req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Deleta uma denúncia
 *     tags: [Denúncias]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Denúncia excluída com sucesso
 *       404:
 *         description: Denúncia não encontrada
 */

//Deleta uma denúncia
router.delete('/:id', async (req, res) => {
  try {
    const result = await DenunciaService.deletar(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

module.exports = router