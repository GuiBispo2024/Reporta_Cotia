const { Denuncia, DenunciaHistorico, sequelize } = require('../models/rel');
const { Op } = require('sequelize');

const REPORT_FIELDS = ['id', 'titulo', 'descricao', 'localizacao', 'categoria', 'latitude', 'longitude', 'status', 'resolucaoStatus', 'setorResponsavel', 'motivoRejeicao', 'createdAt', 'updatedAt', 'resolucaoAtualizadaEm'];
const MAP_FIELDS = ['id', 'titulo', 'localizacao', 'categoria', 'latitude', 'longitude', 'status', 'resolucaoStatus'];

class BoardRepository {
  static grouped(where, fields) {
    return Denuncia.findAll({
      where,
      attributes: [...fields, [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: fields,
      raw: true
    });
  }

  static reports(where, page, limit) {
    return Denuncia.findAll({
      where,
      attributes: REPORT_FIELDS,
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
  }

  static async mapPoints(where, limit = 500) {
    const mapWhere = {
      ...where,
      latitude: { [Op.ne]: null },
      longitude: { [Op.ne]: null }
    };
    const [points, total] = await Promise.all([
      Denuncia.findAll({
        where: mapWhere,
        attributes: MAP_FIELDS,
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit,
        raw: true
      }),
      Denuncia.count({ where: mapWhere })
    ]);

    return { points, total, limit, truncated: total > points.length };
  }

  static serviceMetricRecords(where) {
    return Denuncia.findAll({
      where,
      attributes: ['id', 'createdAt'],
      include: [{
        model: DenunciaHistorico,
        attributes: ['tipo', 'statusNovo', 'createdAt'],
        required: false
      }]
    });
  }
}

module.exports = BoardRepository;
