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
 * /denuncia:
 *   post:
 *     summary: Cria uma nova denúncia (usuário autenticado)
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
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
 *                 example: Buraco grande em frente à escola
 *               localizacao:
 *                 type: string
 *                 example: Rua das Flores, nº 120
 *     responses:
 *       201:
 *         description: Denúncia criada com sucesso
 *       400:
 *         description: Erro ao criar denúncia
 */

//Posta uma denúncia
router.post('/', auth, async (req, res) => {
  try {
    const result = await DenunciaService.create(req.body, req.user)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia/{id}/moderar:
 *   patch:
 *     summary: Modera uma denúncia (somente administradores)
 *     tags: [Denúncias]
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
 *               status:
 *                 type: string
 *                 enum: [pendente, aprovada, rejeitada]
 *                 example: aprovada
 *     responses:
 *       200:
 *         description: Denúncia moderada com sucesso
 *       403:
 *         description: Acesso negado
 */

//Moderação de uma denúncia
router.patch('/:id/moderar', auth, async (req, res) => {
  try {
    const result = await DenunciaService.moderar(req.params.id, req.body.status, req.user.adm)
    res.status(200).json(result)
  } catch (error) {
    res.status(403).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia:
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
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia/filter:
 *   get:
 *     summary: Lista denúncias com filtros aplicados
 *     tags: [Denúncias]
 *     parameters:
 *       - in: query
 *         name: titulo
 *         schema:
 *           type: string
 *         description: Filtra denúncias pelo título
 *         example: Buraco
 *       - in: query
 *         name: descricao
 *         schema:
 *           type: string
 *         description: Filtra denúncias pela descrição
 *         example: escola
 *       - in: query
 *         name: localizacao
 *         schema:
 *           type: string
 *         description: Filtra denúncias pela localização
 *         example: Rua das Flores
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filtra denúncias pelo nome do usuário que criou
 *         example: joaosilva
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Ordenação por data de criação
 *         example: desc
 *     responses:
 *       200:
 *         description: Lista filtrada de denúncias retornada com sucesso
 *       500:
 *         description: Erro interno ao buscar denúncias
 */

// Lista denúncias com filtros
router.get('/filter', async (req, res) => {
  try {
    const { titulo, descricao, localizacao, user, sort } = req.query;

    const denuncias = await DenunciaService.getFiltered({
      titulo,
      descricao,
      localizacao,
      user,
      sort
    });

    res.status(200).json(denuncias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /denuncia/{id}:
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
    res.status(404).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia/user/{userId}:
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
    res.status(404).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia/{id}:
 *   put:
 *     summary: Atualiza uma denúncia (somente o autor pode editar)
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *         description: ID da denúncia a ser atualizada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *                 example: "Buraco ainda não foi consertado"
 *               descricao:
 *                 type: string
 *                 example: "O problema persiste há mais de 2 meses."
 *               categoria:
 *                 type: string
 *                 example: "Infraestrutura"
 *               localizacao:
 *                 type: string
 *                 example: "Rua das Flores, nº 200"
 *     responses:
 *       200:
 *         description: Denúncia atualizada com sucesso.
 *       401:
 *         description: Token JWT ausente ou inválido.
 *       403:
 *         description: Usuário sem permissão para editar.
 *       404:
 *         description: Denúncia não encontrada.
 */

//Edita uma denúncia
router.put('/:id',auth, async (req, res) => {
  try {
    const result = await DenunciaService.atualizar(req.params.id,req.body, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
})

/**
 * @swagger
 * /denuncia/{id}:
 *   delete:
 *     summary: Exclui uma denúncia (somente o autor pode deletar)
 *     tags: [Denúncias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           example: 8
 *         description: ID da denúncia a ser removida
 *     responses:
 *       200:
 *         description: Denúncia excluída com sucesso.
 *       401:
 *         description: Token JWT ausente ou inválido.
 *       403:
 *         description: Usuário sem permissão para excluir.
 *       404:
 *         description: Denúncia não encontrada.
 */

//Deleta uma denúncia
router.delete('/:id',auth, async (req, res) => {
  try {
    const result = await DenunciaService.deletar(req.params.id, req.user.id)
    res.status(200).json(result)
  } catch (error) {
    res.status(404).json({ message: error.message })
  }
})

module.exports = router