const { Share, User } = require('../models/rel')

class ShareRepository {
  
  // Cria um novo compartilhamento
  static async create(data) {
    return Share.create(data)
  }

  // Lista todos os compartilhamentos de uma denúncia
  static async findByDenunciaId(denunciaId, { page = null, limit = null } = {}) {
    const query = {
      where: { denunciaId },
      include: { model: User, attributes: ['id', 'username', 'avatarUrl'] },
      order: [['createdAt', 'DESC']]
    }
    if (!page || !limit) {
      const shares = await Share.findAll(query)
      return { totalShares: shares.length, shares }
    }
    const { rows, count } = await Share.findAndCountAll({ ...query, limit, offset: (page - 1) * limit, distinct: true })
    return { totalShares: count, shares: rows, page, limit, totalPages: Math.ceil(count / limit) }
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
