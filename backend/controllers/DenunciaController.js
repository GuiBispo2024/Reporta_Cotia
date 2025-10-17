const express = require('express')
const router = express.Router()
const {User, Denuncia} = require('../models/rel')
const {filterBadWords} = require('../utils/filterBadWords')

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
router.post('/',async(req,res)=>{
    try{
        const {titulo, descricao, localizacao, userId} = req.body
        const user = await User.findByPk(userId)
        if(!user){
            return res.status(404).json({message:'Usuário não existe'})
        }
        const{hasBadWord: hasBadWordTitulo, filteredText: tituloFiltrado} = filterBadWords(titulo)
        const{hasBadWord: hasBadWordDescricao, filteredText: descricaoFiltrada} = filterBadWords(descricao)
        await Denuncia.create({titulo: tituloFiltrado, descricao: descricaoFiltrada, localizacao, status:'pendente', userId})
        const hasBadWord = hasBadWordTitulo || hasBadWordDescricao
        res.status(201).json({
      message: hasBadWord
        ? 'Denúncia enviada para moderação (palavras censuradas)'
        : 'Denúncia enviada para moderação com sucesso',
      Denuncia
    })
    }catch(error){
        res.status(500).json({error:error.message})
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
router.patch('/:id/moderar', async (req, res) => {
  try{
    const { userId, status } = req.body
    const user = await User.findByPk(userId)
    if(!user){
        return res.status(404).json({message:'Usuário não encontrado'})
    } 
    if(!user.adm){
        return res.status(403).json({message:'Acesso negado. Apenas administradores podem moderar denúncias.'})
    } 
    const denuncia = await Denuncia.findByPk(req.params.id)
    if(!denuncia){
        return res.status(404).json({message: 'Denúncia não encontrada' })
    } 
    if(!['pendente', 'aprovada', 'rejeitada'].includes(status)) {
        return res.status(400).json({message: 'Status inválido' })
    }
    await denuncia.update({ status })
    res.status(200).json({
      message: `Denúncia marcada como ${status}`,denuncia})
  }catch(error){
    res.status(500).json({ error: error.message })
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
router.get('/',async(req,res)=>{
    try{
        const denuncias = await Denuncia.findAll({
            include:{
                model: User,
                attributes: ['id','username','email']
            }
        })
        res.status(200).json(denuncias)
    }catch(error){
        res.status(500).json({error: error.message})
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
router.get('/:id',async(req,res)=>{
    try{
        const denuncia = await Denuncia.findByPk(req.params.id,{
            include:{model: User, attributes:['id','username','email']}
        })
        if(!denuncia){
            return res.status(404).json({message:'Denúncia não encontrada'})
        }
        res.status(200).json(denuncia)
    }catch(error){
        res.status(500).json({error: error.message})
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
    const denuncias = await Denuncia.findAll({
      where: { userId: req.params.userId }
    })
    if(!denuncias.length) {
      return res.status(404).json({ message: 'Nenhuma denúncia encontrada para este usuário' })
    }
    res.status(200).json(denuncias)
  }catch(error) {
    res.status(500).json({ error: error.message })
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
router.put('/:id',async(req,res)=>{
    try{
        const {titulo, descricao, localizacao} = req.body
        const [rowsUpdate] = await Denuncia.update(
            {titulo, descricao, localizacao},
            {where:{id: req.params.id}}
        )
        if(!rowsUpdate){
            return res.status(404).json({message: 'Denúncia não encontrada'})
        }
        res.status(200).json({message:'Denúncia atualizada com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
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
router.delete('/:id',async(req,res)=>{
    try{
        const rowDel = await Denuncia.destroy({where:{id:req.params.id}})
        if(!rowDel){
            return res.status(404).json({message: 'Denúncia não encontrada'})
        }
        res.status(200).json({message:'Denúncia excluída com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

module.exports = router