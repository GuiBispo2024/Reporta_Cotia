const express = require('express')
const router = express.Router()
const { Like, User, Denuncia } = require('../models/rel')

// Dá like
router.post('/denuncia/:id/like', async (req, res) => {
  try {
    const { userId } = req.body
    const denunciaId = req.params.id

    const user = await User.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'Usuário não existe' })
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })

    const [like, created] = await Like.findOrCreate({ where: { userId, denunciaId } })
    if (!created) return res.status(400).json({ message: 'Usuário já curtiu essa denúncia' })

    res.status(201).json({ message: 'Curtida registrada' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Remove like
router.delete('/denuncia/:id/like', async (req, res) => {
  try {
    const { userId } = req.body
    const rows = await Like.destroy({ where: { userId, denunciaId: req.params.id } })
    if (!rows) return res.status(404).json({ message: 'Like não encontrado' })
    res.status(200).json({ message: 'Like removido' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Lista likes
router.get('/denuncia/:id/likes', async (req, res) => {
  try {
    const denuncia = await Denuncia.findByPk(req.params.id, {
      include: { model: User, as: 'likes', attributes: ['id', 'username'] }
    })
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })
    res.status(200).json({ totalLikes: denuncia.likes.length, usuarios: denuncia.likes })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
