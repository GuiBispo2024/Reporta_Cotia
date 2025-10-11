const express = require('express')
const router = express.Router()
const Denuncia = require('../models/Reporta_Cotia_Tables/Denuncia')
const User = require('../models/Reporta_Cotia_Tables/User')

//Lista todas as denúncias
router.get('/',async(req,res)=>{
    try{
        const denuncias = await Denuncia.findAll({
            include:{
                model: User,
                as: 'user',
                attributes: ['id','username','email']
            }
        })
        res.status(200).json(denuncias)
    }catch(error){
        res.status(500).json({error: error.message})
    }
})

//Posta uma denúncia
router.post('/',async(req,res)=>{
    try{
        const {titulo, descricao, userId} = req.body
        const user = await User.findByPk(userId)
        if(!user){
            return res.status(404).json({message:'Usuário não existe'})
        }
        await Denuncia.create({titulo,descricao,userId})
        res.status(201).json({message:'Denúncia cadastrada'})
    }catch(error){
        res.status(500).json({error:error.message})
    }
})

//Procura uma denúncia específica
router.get('/:id',async(req,res)=>{
    try{
        const denuncia = await Denuncia.findByPk(req.params.id,{
            include:{model: User, as: 'user', attributes:['id','username','email']}
        })
        if(!denuncia){
            return res.status(404).json({message:'Denúncia não encontrada'})
        }
        res.status(200).json(denuncia)
    }catch(error){
        res.status(500).json({error: error.message})
    }
})

//Procura todas as denúncias de um usuário específico
router.get('/user/:userId', async (req, res) => {
  try {
    const denuncias = await Denuncia.findAll({
      where: { userId: req.params.userId }
    })
    if (!denuncias.length) {
      return res.status(404).json({ message: 'Nenhuma denúncia encontrada para este usuário' })
    }
    res.status(200).json(denuncias)
  }catch (error) {
    res.status(500).json({ error: error.message })
  }
})

//Edita uma denúncia
router.put('/:id',async(req,res)=>{
    try{
        const {titulo,descricao} = req.body
        const [rowsUpdate] = await Denuncia.update(
            {titulo,descricao},
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