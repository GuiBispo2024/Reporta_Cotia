const { Denuncia, DenunciaHistorico, Comment, BoardExportHistory, sequelize } = require('../models/rel');
const { Op } = require('sequelize');

const REPORT_FIELDS = ['id', 'titulo', 'descricao', 'localizacao', 'bairro', 'categoria', 'latitude', 'longitude', 'status', 'resolucaoStatus', 'setorResponsavel', 'motivoRejeicao', 'createdAt', 'updatedAt', 'resolucaoAtualizadaEm'];
const EXPORT_FIELDS = ['id', 'titulo', 'localizacao', 'bairro', 'categoria', 'status', 'resolucaoStatus', 'setorResponsavel', 'createdAt', 'updatedAt'];
const MAP_FIELDS = ['id', 'titulo', 'localizacao', 'bairro', 'categoria', 'latitude', 'longitude', 'status', 'resolucaoStatus'];

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
      attributes: ['id', 'categoria', 'createdAt'],
      include: [{
        model: DenunciaHistorico,
        attributes: ['tipo', 'statusNovo', 'createdAt'],
        required: false
      }]
    });
  }

  static async moderationIndicators(where) {
    const [censoredReports, censoredComments, rejectionReasons] = await Promise.all([
      Denuncia.count({
        where: {
          ...where,
          [Op.or]: [{ tituloCensurado: true }, { descricaoCensurada: true }]
        }
      }),
      Comment.count({
        where: { censurado: true },
        include: [{
          model: Denuncia,
          attributes: [],
          where,
          required: true
        }]
      }),
      Denuncia.findAll({
        where: {
          ...where,
          status: 'rejeitada',
          motivoRejeicao: { [Op.ne]: null }
        },
        attributes: ['motivoRejeicao', [sequelize.fn('COUNT', sequelize.col('Denuncia.id')), 'total']],
        group: ['motivoRejeicao'],
        order: [[sequelize.literal('total'), 'DESC'], ['motivoRejeicao', 'ASC']],
        limit: 5,
        raw: true
      })
    ]);

    return {
      censoredReports,
      censoredComments,
      rejectionReasons: rejectionReasons.map(item => ({
        label: item.motivoRejeicao,
        total: Number(item.total)
      }))
    };
  }

  static exportReports(where) {
    return Denuncia.findAll({
      where,
      attributes: EXPORT_FIELDS,
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      raw: true
    });
  }

  static recordExportAudit(data) {
    return BoardExportHistory.create(data);
  }
}

module.exports = BoardRepository;
