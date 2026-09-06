const express = require('express')
const router = express.Router()
const UserService = require('../services/UserService')
const auth = require('../middlewares/auth')
const { upload, storeImage } = require('../utils/upload')
const PasswordResetService = require('../services/PasswordResetService')

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
router.post('/', upload.single('avatar'), async(req,res, next)=>{
    try{
        const avatarUrl = await storeImage(req.file, 'perfis')
        const user = await UserService.register({ ...req.body, avatarUrl })
        res.status(201).json({user})
    }catch(error){
        if (error.name === 'SequelizeUniqueConstraintError') {
          return res.status(409).json({ message: 'Já existe uma conta com este e-mail ou nome de usuário.' })
        }
        if (error.message?.includes('cadastrado')) {
          return res.status(409).json({ message: error.message })
        }
        next(error)
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
router.get('/', auth, async (req, res) => {
  try {
    const users = req.query.withCounts === 'true'
      ? await UserService.getAllWithDenunciaCount(req.user.adm, {
          page: Math.max(Number.parseInt(req.query.page || '1', 10), 1),
          limit: Math.min(Math.max(Number.parseInt(req.query.limit || '20', 10), 1), 50),
          search: req.query.search || '',
          sort: req.query.sort || 'username'
        })
      : await UserService.getAll()
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /users/denunciaCount:
 *   get:
 *     summary: Lista todos os usuários com contagem de denúncias
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista com contagens
 *       401:
 *         description: Token inválido
 *       500:
 *         description: Erro interno do servidor
 */

//Lista todos os usuários com a contagem de denúncias feitas por cada um
router.get('/denunciaCount', auth, async (req, res) => {
  try{
    const page = Math.max(Number.parseInt(req.query.page || '1', 10), 1)
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '20', 10), 1), 50)
    const resultado = await UserService.getAllWithDenunciaCount(req.user.adm, { page, limit, search: req.query.search || '', sort: req.query.sort || 'username' });
    res.set('Deprecation-Notice', 'Use GET /users?withCounts=true.');
    res.status(200).json(resultado);
  }catch(error){
    res.status(500).json({ message: error.message })
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.status(200).json(await UserService.getMe(req.user.id))
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
})

router.post('/password/forgot', async (req, res, next) => {
  try {
    res.status(200).json(await PasswordResetService.request(req.body.email, req))
  } catch (error) { next(error) }
})

router.post('/password/reset', async (req, res, next) => {
  try {
    res.status(200).json(await PasswordResetService.reset(req.body.token, req.body.password, req))
  } catch (error) { next(error) }
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
 *       401:
 *         description: Token inválido ou não fornecido
 *       403:
 *         description: Você não tem permissão para atualizar este usuário
 */

//Altera um usuário
router.put('/update', auth, async (req, res) => {
  try {
    const result = await UserService.update(req.body, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    const status = error.name === 'SequelizeUniqueConstraintError' ? 409 : 400
    res.status(status).json({ message: error.message })
  }
})

router.patch('/avatar', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Selecione uma imagem para o perfil.' })
    const avatarUrl = await storeImage(req.file, 'perfis')
    res.status(200).json(await UserService.updateAvatar(req.user.id, avatarUrl))
  } catch (error) {
    next(error)
  }
})

router.delete('/avatar', auth, async (req, res, next) => {
  try {
    res.status(200).json(await UserService.removeAvatar(req.user.id))
  } catch (error) {
    next(error)
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
    const result = await UserService.updateAdm(req.params.id, adm, req.user.adm, req.user.id)
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
    const result = await UserService.logout(req.user.id)
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
 *       401:
 *         description: Token inválido ou não fornecido
 *       404:
 *         description: Usuário não encontrado
 */

//Deleta um usuário
router.delete('/delete',auth, async (req, res) => {
  try {
    const result = await UserService.delete(req.user.id, (req.body || {}).senhaAtual)
    res.status(200).json(result)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
})

module.exports = router
