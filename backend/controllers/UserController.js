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
 *       400:
 *         description: Credenciais inválidas
 */

//Cadastra um usuário
router.post('/',async(req,res)=>{
    try{
        const user = await UserService.register(req.body)
        res.status(201).json({user})
    }catch(error){
        res.status(400).json({message:error.message})
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
    res.status(401).json({ message: error.message })
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
 *       500:
 *         description: Erro interno do servidor
 */

//Lista todos os usuários
router.get('/', async (req, res) => {
  try {
    const users = await UserService.getAll()
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
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
    res.status(404).json({ message: error.message })
  }
})

/**
 * @swagger
 * /users/update:
 *   put:
 *     summary: Atualiza o próprio usuário (autenticado)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
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
 *                 example: novaSenha123
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       403:
 *         description: Você só pode atualizar seu próprio perfil
 *       401:
 *         description: Token inválido ou não fornecido
 */

//Altera um usuário
router.put('/update',auth, async (req, res) => {
  try {
    const result = await UserService.update(req.body,req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ message: error.message })
  }
})

/**
 * @swagger
 * /users/{id}/adm:
 *   put:
 *     summary: Altera a permissão (adm) de um usuário — apenas administradores
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
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
 *               adm:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Permissão alterada com sucesso
 *       403:
 *         description: Apenas administradores podem alterar permissões
 *       404:
 *         description: Usuário não encontrado
 */

//Altera perfil de usuário para adm(apenas adm pode fazer)
router.put('/:id/adm', auth, async (req, res) => {
  try {
    const { adm } = req.body
    const result = await UserService.updateAdm(req.params.id, adm, req.user.adm)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ message: error.message })
  }
})

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Faz logout do usuário autenticado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *       401:
 *         description: Token inválido ou não fornecido
 */

//Logout de usuário(simbolico)
router.post('/logout', auth, async (req, res) => {
  try {
    const result = await UserService.logout()
    res.status(200).json(result)
  } catch (error) {
    res.status(401).json({ message: error.message })
  }
})

/**
 * @swagger
 * /users/delete:
 *   delete:
 *     summary: Deleta o próprio usuário (autenticado)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuário excluído com sucesso
 *       403:
 *         description: Você só pode excluir sua própria conta
 *       401:
 *         description: Token inválido ou não fornecido
 */

//Deleta um usuário
router.delete('/delete',auth, async (req, res) => {
  try {
    const result = await UserService.delete(req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ message: error.message })
  }
})

module.exports = router