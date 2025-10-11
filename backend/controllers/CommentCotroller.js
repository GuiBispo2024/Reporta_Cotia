const express = require('express')
const router = express.Router()
const Denuncia = require('../models/Reporta_Cotia_Tables/Denuncia')
const User = require('../models/Reporta_Cotia_Tables/User')
const Comment = require('../models/Reporta_Cotia_Tables/Comment')
const filterBadWords = require('../utils/filterBadWords')

// Cria comentário
router.post('/', async (req, res) => {
  try {
    const { texto, userId, denunciaId } = req.body
    const user = await User.findByPk(userId)
    if (!user) return res.status(404).json({ message: 'Usuário não existe' })
    const denuncia = await Denuncia.findByPk(denunciaId)
    if (!denuncia) return res.status(404).json({ message: 'Denúncia não existe' })

    const { hasBadWord, filteredText } = filterBadWords(texto)

    const comentario = await Comment.create({ texto: filteredText, userId, denunciaId })

    res.status(201).json({
      message: hasBadWord
        ? 'Comentário publicado (palavras censuradas)'
        : 'Comentário publicado com sucesso',
      comentario
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Lista comentários de uma denúncia
router.get('/denuncia/:id', async (req, res) => {
  try {
    const comentarios = await Comment.findAll({
      where: { denunciaId: req.params.id },
      include: { model: User, as: 'user', attributes: ['id', 'username'] }
    })
    res.status(200).json(comentarios)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Deleta comentário
router.delete('/:id', async (req, res) => {
  try {
    const rows = await Comment.destroy({ where: { id: req.params.id } })
    if (!rows) return res.status(404).json({ message: 'Comentário não encontrado' })
    res.status(200).json({ message: 'Comentário excluído com sucesso' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

module.exports = router