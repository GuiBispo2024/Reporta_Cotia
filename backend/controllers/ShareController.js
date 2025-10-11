const express = require('express')
const router = express.Router()
const Denuncia = require('../models/Reporta_Cotia_Tables/Denuncia')
const User = require('../models/Reporta_Cotia_Tables/User')
const Share = require('../models/Reporta_Cotia_Tables/Share')

// Compartilha denúncia
router.post('/denuncia/:id/share', async (req, res) => {
  try {
    const { userId, comentario } = req.body
    const denunciaId = req.params.id

    const user = await User.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'Usuário não existe' })
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })

    const share = await Share.create({ userId, denunciaId, comentario })
    res.status(201).json({ message: 'Denúncia compartilhada!', share })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Lista compartilhamentos
router.get('/denuncia/:id/shares', async (req, res) => {
  try {
    const shares = await Share.findAll({
      where: { denunciaId: req.params.id },
      include: { model: User, as: 'user', attributes: ['id', 'username'] }
    })
    res.status(200).json({ totalShares: shares.length, shares })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
