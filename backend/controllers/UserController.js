const express = require('express')
const router = express.Router()
const UserService = require('../services/UserService')
const auth = require('../middlewares/auth')
const { upload, storeImage } = require('../utils/upload')
const PasswordResetService = require('../services/PasswordResetService')
const requirePermission = require('../middlewares/requirePermission')
const { PERMISSIONS } = require('../constants/accessControl')
const { hasPermission } = require('../utils/authorization')

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
 *     description: Cria uma conta com o perfil padrão `CITIZEN`. Campos administrativos enviados pelo cliente são ignorados.
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
 *                 minLength: 6
 *                 example: 123456
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: guilherme }
 *               email: { type: string, format: email, example: gui@email.com }
 *               password: { type: string, format: password, minLength: 6, example: "123456" }
 *               avatar: { type: string, format: binary, description: Imagem de perfil opcional, com até 5 MB. }
 *     responses:
 *       201:
 *         description: Usuário cadastrado como cidadão
 *       400:
 *         description: Credenciais inválidas
 *       409:
 *         description: E-mail ou nome de usuário já cadastrado
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [message, token, user]
 *               properties:
 *                 message: { type: string, example: Login bem-sucedido }
 *                 token: { type: string, description: Token JWT da sessão. }
 *                 user: { $ref: '#/components/schemas/AuthenticatedUser' }
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
 *     description: A comunidade é acessível a usuários autenticados. O e-mail é incluído somente para quem possui `users.view`.
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: withCounts, schema: { type: boolean }, description: Inclui contagem e paginação quando verdadeiro. }
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: sort, schema: { type: string, enum: [username, contributions] } }
 *     responses:
 *       200:
 *         description: Lista de usuários com dados administrativos condicionados a `users.view`
 *       500:
 *         description: Erro interno do servidor
 *       401:
 *         description: Sessão ausente, expirada ou revogada
 */

//Lista todos os usuários
router.get('/', auth, async (req, res) => {
  try {
    const users = req.query.withCounts === 'true'
      ? await UserService.getAllWithDenunciaCount(hasPermission(req.user, PERMISSIONS.USERS_VIEW), {
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
    const resultado = await UserService.getAllWithDenunciaCount(hasPermission(req.user, PERMISSIONS.USERS_VIEW), { page, limit, search: req.query.search || '', sort: req.query.sort || 'username' });
    res.set('Deprecation-Notice', 'Use GET /users?withCounts=true.');
    res.status(200).json(resultado);
  }catch(error){
    res.status(500).json({ message: error.message })
  }
});

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Retorna o usuário autenticado e seus acessos atuais
 *     description: As permissões são consultadas no banco nesta requisição. Senha e versão da sessão nunca são retornadas.
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário, perfis e permissões sem duplicidade
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthenticatedUser'
 *       401:
 *         description: Sessão ausente, expirada ou revogada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/me', auth, async (req, res) => {
  try {
    res.status(200).json(await UserService.getMe(req.user.id))
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
})

/**
 * @swagger
 * /users/access/roles:
 *   get:
 *     summary: Lista os perfis disponíveis e suas permissões
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Perfis e permissões disponíveis }
 *       403: { description: Requer a permissão `users.manage_roles` }
 */
router.get('/access/roles', auth, requirePermission(PERMISSIONS.USERS_MANAGE_ROLES), async (req, res, next) => {
  try {
    res.status(200).json(await UserService.getAvailableRoles())
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /users/access/role-history:
 *   get:
 *     summary: Consulta o histórico de alterações de perfis
 *     description: Requer `audit.view`. Permite ordenar o histórico pela data da alteração.
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 50, default: 20 } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, oldest], default: newest }, description: Ordenação pela data da alteração. }
 *     responses:
 *       200:
 *         description: Histórico paginado de alterações de perfis
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: '#/components/schemas/Pagination' }
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/UserRoleHistory' }
 *       400: { description: Ordenação inválida }
 *       401: { description: Sessão ausente, expirada ou revogada }
 *       403: { description: Requer a permissão `audit.view` }
 */
router.get('/access/role-history', auth, requirePermission(PERMISSIONS.AUDIT_VIEW), async (req, res, next) => {
  try {
    res.status(200).json(await UserService.getRoleHistory(req.query))
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /users/{id}/roles:
 *   put:
 *     summary: Substitui os perfis de acesso de um usuário
 *     description: Requer `users.manage_roles`. O perfil `CITIZEN` é mantido automaticamente. Não é possível remover o próprio perfil `ADMIN` nem o último administrador da plataforma.
 *     tags: [Usuários]
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
 *             required: [roles]
 *             properties:
 *               roles:
 *                 type: array
 *                 uniqueItems: true
 *                 items: { type: string, enum: [CITIZEN, MODERATOR, ANALYST, ADMIN] }
 *                 example: [CITIZEN, MODERATOR]
 *     responses:
 *       200: { description: Perfis atualizados com sucesso }
 *       400: { description: Lista ou perfil inválido }
 *       403: { description: Sem permissão ou tentativa de autodespromoção }
 *       404: { description: Usuário não encontrado }
 *       409: { description: Tentativa de remover o último administrador }
 */
router.put('/:id/roles', auth, requirePermission(PERMISSIONS.USERS_MANAGE_ROLES), async (req, res, next) => {
  try {
    res.status(200).json(await UserService.updateRoles(req.params.id, req.body?.roles, req.user.id))
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /users/password/forgot:
 *   post:
 *     summary: Solicita a redefinição de senha
 *     description: Por segurança, a resposta não confirma se o e-mail está cadastrado.
 *     tags: [Usuários]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Solicitação recebida
 *       400:
 *         description: E-mail inválido
 */
router.post('/password/forgot', async (req, res, next) => {
  try {
    res.status(200).json(await PasswordResetService.request(req.body.email, req))
  } catch (error) { next(error) }
})

/**
 * @swagger
 * /users/password/reset:
 *   post:
 *     summary: Redefine a senha usando um token válido
 *     tags: [Usuários]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password, minLength: 6 }
 *     responses:
 *       200:
 *         description: Senha redefinida; sessões anteriores são revogadas
 *       400:
 *         description: Token ou senha inválidos
 */
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
 *     description: Endpoint público. Retorna somente informações públicas do perfil.
 *     tags: [Usuários]
 *     security: []
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
 *                 deprecated: true
 *                 description: Não utilizado para troca de senha.
 *               senhaAtual:
 *                 type: string
 *                 format: password
 *               novaSenha:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 token: { type: string }
 *                 user: { $ref: '#/components/schemas/AuthenticatedUser' }
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

/**
 * @swagger
 * /users/avatar:
 *   patch:
 *     summary: Atualiza a foto do usuário autenticado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar: { type: string, format: binary, description: Imagem de até 5 MB. }
 *     responses:
 *       200:
 *         description: Foto de perfil atualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/AuthenticatedUser' }
 *       400: { description: Arquivo ausente ou inválido }
 *       401: { description: Sessão ausente, expirada ou revogada }
 */
router.patch('/avatar', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Selecione uma imagem para o perfil.' })
    const avatarUrl = await storeImage(req.file, 'perfis')
    res.status(200).json(await UserService.updateAvatar(req.user.id, avatarUrl))
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /users/avatar:
 *   delete:
 *     summary: Remove a foto do usuário autenticado
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Foto de perfil removida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 user: { $ref: '#/components/schemas/AuthenticatedUser' }
 *       401: { description: Sessão ausente, expirada ou revogada }
 */
router.delete('/avatar', auth, async (req, res, next) => {
  try {
    res.status(200).json(await UserService.removeAvatar(req.user.id))
  } catch (error) {
    next(error)
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
