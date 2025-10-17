const express = require('express')
const router = express.Router()
const {User} = require('../models/rel')

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
        const {username,email,password} = req.body
        await User.create({username,email,password})
        res.status(201).json({message:'Cadastrado com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
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
router.get('/', async(req,res)=>{
    try{
        const users = await User.findAll()
        res.status(200).json(users)
    }catch(error){
        res.status(500).json({error:error.message})
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
router.get('/:id',async(req,res)=>{
    try{
        const user = await user.findByPk(re.params.id)
        if(!user){
            return res.status(404).json({error: error.message})
        }
        res.status(200).json(user)
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza um usuário
 *     tags: [Usuários]
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
 *               username:
 *                 type: string
 *                 example: novoUser
 *               email:
 *                 type: string
 *                 example: novo@email.com
 *               password:
 *                 type: string
 *                 example: novaSenha
 *               adm:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *       404:
 *         description: Usuário não encontrado
 */

//Altera um usuário
router.put('/:id',async(req,res)=>{
    try{
        const {username,email,password,adm} = req.body
        const [rowsUpdate] = await User.update(
            {username,email,password,adm},
            {where: {id:req.params.id}}
        )
        if(!rowsUpdate){
            return res.status(404).json({message: 'Usuário não encontrado'})
        }
        res.status(200).json({message:'Atualizado com sucesso'})        
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Deleta um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário excluído
 *       404:
 *         description: Usuário não encontrado
 */

//Deleta um usuário
router.delete('/:id',async(req,res)=>{
    try{
        const rowsDel = await User.destroy({where:{id: req.params.id}})
        if(!rowsDel){
            return res.status(404).json({message:'Usuário não encontrado'})
        }
        res.status(200).json({message: 'Excluído com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

module.exports = router