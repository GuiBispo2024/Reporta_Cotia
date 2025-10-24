const express = require('express')
const router = express.Router()
const UserService = require('../services/UserService')
const auth = require('../middlewares/auth')

/**
 * @swagger
 * tags:
 *   name: Usuários
 *   description: Endpoints para gerenciamento de usuários
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: guilherme
 *               email:
 *                 type: string
 *                 example: gui@email.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso
 *       500:
 *         description: Erro interno do servidor
 */

//Cadastra um usuário
router.post('/',async(req,res)=>{
    try{
        const user = await UserService.register(req.body)
        res.status(201).json({user})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Faz login do usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: gui@email.com
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *       401:
 *         description: Credenciais inválidas
 */

//Login de usuário
router.post('/login', async (req, res) => {
  try {
    const result = await UserService.login(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(401).json({ error: error.message })
  }
})

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Usuários]
 *     responses:
 *       200:
 *         description: Lista de usuários
 */

//Lista todos os usuários
router.get('/', async (req, res) => {
  try {
    const users = await UserService.getAll()
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Busca um usuário específico
 *     tags: [Usuários]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *       404:
 *         description: Usuário não encontrado
 */

//Procura um usuário específico
router.get('/:id', async (req, res) => {
  try {
    const user = await UserService.getById(req.params.id)
    res.status(200).json(user)
  } catch (error) {
    res.status(404).json({ error: error.message })
  }
})

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza um usuário (apenas o próprio)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               username:
 *                 type: string
 *                 example: novoUser
 *               email:
 *                 type: string
 *                 example: novo@email.com
 *               password:
 *                 type: string
 *                 example: novaSenha
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       403:
 *         description: Acesso negado
 */

//Altera um usuário
router.put('/:id',auth, async (req, res) => {
  try {
    const { id } = req.params
    const { id: userId } = req.user
    const result = await UserService.update(id, req.body, userId)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ error: error.message })
  }
})

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Deleta o próprio usuário
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário excluído com sucesso
 *       403:
 *         description: Acesso negado
 */

//Deleta um usuário
router.delete('/:id',auth, async (req, res) => {
  try {
    const { id } = req.params
    const { id: userId } = req.user
    const result = await UserService.delete(id, userId)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ error: error.message })
  }
})

module.exports = router