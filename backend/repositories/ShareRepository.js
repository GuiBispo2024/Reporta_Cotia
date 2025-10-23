const { Share, User } = require('../models/rel')

class ShareRepository {
  // Cria um novo compartilhamento
  static async create(data) {
    return Share.create(data)
  }

  // Lista todos os compartilhamentos de uma denúncia
  static async findByDenunciaId(denunciaId) {
    const shares = await Share.findAll({
      where: { denunciaId },
      include: { model: User, attributes: ['id', 'username'] }
    })
    return { totalShares: shares.length, shares }
  }

  // Busca um compartilhamento pelo ID
  static async findById(id) {
    return Share.findByPk(id)
  }

  // Deleta um compartilhamento
  static async delete(id) {
    return Share.destroy({ where: { id } })
  }
}

module.exports = ShareRepository