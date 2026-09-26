const { Denuncia, Comment, BoardExportHistory, User, sequelize } = require('../models/rel');
const { Op } = require('sequelize');

const REPORT_FIELDS = ['id', 'titulo', 'descricao', 'localizacao', 'bairro', 'categoria', 'status', 'resolucaoStatus', 'setorResponsavel', 'motivoRejeicao', 'createdAt', 'updatedAt', 'resolucaoAtualizadaEm'];
const EXPORT_FIELDS = ['id', 'titulo', 'localizacao', 'bairro', 'categoria', 'status', 'resolucaoStatus', 'setorResponsavel', 'createdAt', 'updatedAt'];
const MAP_FIELDS = [...REPORT_FIELDS, 'latitude', 'longitude'];

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

  static async heatmapCells(where, { precision = 3, minReports = 3, limit = 1000 } = {}) {
    const latitudeCell = sequelize.fn('ROUND', sequelize.col('latitude'), precision);
    const longitudeCell = sequelize.fn('ROUND', sequelize.col('longitude'), precision);
    const reportCount = sequelize.fn('COUNT', sequelize.col('id'));
    const rows = await Denuncia.findAll({
      where: {
        ...where,
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
      },
      attributes: [
        [latitudeCell, 'latitude'],
        [longitudeCell, 'longitude'],
        [reportCount, 'total']
      ],
      group: [latitudeCell, longitudeCell],
      having: sequelize.where(reportCount, { [Op.gte]: minReports }),
      order: [[reportCount, 'DESC']],
      limit,
      raw: true
    });

    return rows.map(cell => ({
      latitude: Number(cell.latitude),
      longitude: Number(cell.longitude),
      total: Number(cell.total)
    }));
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

  static async exportAuditHistory({ page, limit, sort }) {
    const { rows, count } = await BoardExportHistory.findAndCountAll({
      order: [['createdAt', sort === 'oldest' ? 'ASC' : 'DESC'], ['id', sort === 'oldest' ? 'ASC' : 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
    const userIds = [...new Set(rows.map(item => item.userId))];
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'username'], raw: true })
      : [];
    const usernames = new Map(users.map(user => [Number(user.id), user.username]));
    return {
      data: rows.map(item => ({
        id: item.id,
        user: { id: item.userId, username: usernames.get(Number(item.userId)) || 'Usuário removido' },
        format: item.format,
        filters: item.filters,
        recordCount: item.recordCount,
        createdAt: item.createdAt
      })),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }
}

module.exports = BoardRepository;
