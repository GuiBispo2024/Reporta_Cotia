const express = require('express')
const router = express.Router()
const User = require('../models/User')

router.get('/', async(req,res)=>{
    try{
        const users = await User.find()
        res.status(200).json(users)
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

router.post('/',async(req,res)=>{
    try{
        const {username,email,password} = req.body
        const newUser = new User({username,email,password,denuncias:[]})
        await newUser.save()
        res.status(201).json({message:'Cadastrado com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

router.post('/denuncia',async(req,res)=>{
    try{
        const {username,titulo,descricao} = req.body
        const user = await User.findOne({username})
        if(!user){
            return res.status(404).json({message:'Usuário não encontrado'})
        }
        const novaDenuncia = {titulo,descricao}
        user.denuncias.push(novaDenuncia)
        await user.save()
        res.status(201).json({message:'Denúncia registrada com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

router.get('/:id',async(req,res)=>{
    try{
        const user = await user.findById(re.params.id)
        res.status(200).json(user)
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

router.delete('/:id',async(req,res)=>{
    try{
        await User.findByIdAndDelete(req.params.id)
        res.status(200).json({message:'Excluido com sucesso'})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

router.put('/:id',async(req,res)=>{
    try{
        const {username,email,password,denuncias} = req.body
        await User.findByIdAndUpdate(req.params.id,{username,email,password,denuncias})
        res.status(200).json({message:'Atualizado com sucesso'})        
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

module.exports = router