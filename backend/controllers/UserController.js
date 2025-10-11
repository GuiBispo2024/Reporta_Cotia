const express = require('express')
const router = express.Router()
const User = require('../models/Reporta_Cotia_Tables/User')

//Lista todos os usuários
router.get('/', async(req,res)=>{
    try{
        const users = await User.findAll()
        res.status(200).json(users)
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

//Cadastra um usuário
router.post('/',async(req,res)=>{
    try{
        const {username,email,password,adm} = req.body
        await User.create({username,email,password,adm})
        res.status(201).json({message:'Cadastrado com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

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