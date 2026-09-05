const { Denuncia, User, Like, Share, Comment, sequelize } = require('../models/rel');
const { Op } = require('sequelize');
const dialect = sequelize.getDialect();
const operator = dialect === 'sqlite' ? Op.like : Op.iLike;

class DenunciaRepository {
  static baseQueryConfig(order, includeSensitive = false) {
    return {
      include: [
        { model: User, attributes: ['id', 'username', 'avatarUrl'] },
        { model: Like, attributes: [] }
      ],
      attributes: {
        ...(includeSensitive ? {} : { exclude: ['tituloOriginal', 'descricaoOriginal'] }),
        include: [[sequelize.fn('COUNT', sequelize.col('Likes.id')), 'likesCount']]
      },
      group: ['Denuncia.id', 'User.id'],
      order
    };
  }

  static baseQueryConfigFiltered(order, userWhere = null) {
    return {
      include: [
        { model: User, attributes: ['id', 'username', 'avatarUrl'], ...(userWhere ? { where: userWhere } : {}) },
        { model: Like, attributes: [] }
      ],
      attributes: {
        include: [[sequelize.fn('COUNT', sequelize.col('Likes.id')), 'likesCount']]
      },
      group: ['Denuncia.id', 'User.id'],
      order
    };
  }

  static async create(data) {
    return Denuncia.create(data);
  }

  static async findById(id) {
    return Denuncia.findByPk(id, {
      include: { model: User, attributes: ['id', 'username', 'avatarUrl'] }
    });
  }

  static async findAll({ page = null, limit = null, status, categoria, resolucaoStatus } = {}) {
    const order = [['createdAt', 'DESC']];
    const where = {
      ...(status ? { status } : {}),
      ...(categoria ? { categoria } : {}),
      ...(resolucaoStatus ? { resolucaoStatus } : {})
    };
    // A moderação não exibe o agregado de curtidas. Usar baseQueryConfig
    // aqui fazia a paginação referenciar Likes.id antes do JOIN ser criado.
    const query = {
      where,
      include: [{ model: User, attributes: ['id', 'username', 'avatarUrl'] }],
      order
    };
    if (!page || !limit) return Denuncia.findAll(query);

    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      Denuncia.findAll({ ...query, limit, offset }),
      Denuncia.count({ where })
    ]);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async findApproved({ page = null, limit = null } = {}) {
    const where = { status: 'aprovada' };
    const order = [['createdAt', 'DESC']];
    if (!page || !limit) {
      return Denuncia.findAll({ ...this.baseQueryConfig(order), where });
    }

    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      Denuncia.findAll({ ...this.baseQueryConfig(order), where, limit, offset }),
      Denuncia.count({ where })
    ]);
    return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async findWithFilters({
    titulo,
    descricao,
    localizacao,
    user,
    categoria,
    resolucaoStatus,
    sort,
    page = 1,
    limit = 12
  }) {
    // Esta consulta alimenta a área pública; denúncias não aprovadas permanecem privadas.
    const where = { status: 'aprovada' };
    let userWhere = null;

    const normalized = value => typeof value === 'string' ? value.trim() : value;
    titulo = normalized(titulo);
    descricao = normalized(descricao);
    localizacao = normalized(localizacao);
    user = normalized(user);
    categoria = normalized(categoria);
    resolucaoStatus = normalized(resolucaoStatus);

    if (titulo) {
        where.titulo = {
            [operator]: `%${titulo}%`
        };
    }

    if (descricao) {
        where.descricao = { [operator]: `%${descricao}%` };
    }

    if (localizacao) {
        where.localizacao = {
            [operator]: `%${localizacao}%`
        };
    }

    if (user) {
        userWhere = { username: { [operator]: `%${user}%` } };
    }

    if (categoria) {
        where.categoria = { [operator]: categoria };
    }

    if (resolucaoStatus) {
        where.resolucaoStatus = resolucaoStatus;
    }

    const currentPage = Math.max(Number(page) || 1, 1);

    const currentLimit = Math.min(
        Math.max(Number(limit) || 12, 1),
        50
    );

    if (sort === 'likes') {
        return this.findOrderedByLikes(
            where,
            currentPage,
            currentLimit,
            userWhere
        );
    }

    if (sort === 'shares') {
        return this.findOrderedByShares(
            where,
            currentPage,
            currentLimit,
            userWhere
        );
    }

    return this.findOrderedByDate(
        where,
        currentPage,
        currentLimit,
        userWhere
    );
  }

  static async findOrderedByDate(
    where,
    page,
    limit,
    userWhere
  ) {
    const offset = (page - 1) * limit;

    const { rows, count } =
        await Denuncia.findAndCountAll({
            where,
            attributes: { exclude: ['tituloOriginal', 'descricaoOriginal'] },

            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'avatarUrl'],
                    ...(userWhere ? { where: userWhere } : {})
                }
            ],

            order: [
                ['createdAt', 'DESC']
            ],

            limit,
            offset,

            distinct: true
        });

    const denuncias =
        await this.addLikesCount(rows);

    return {
        data: denuncias,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
    };
  }

  static async addLikesCount(denuncias) {
    if (!denuncias.length) {
        return [];
    }

    const ids = denuncias.map(
        denuncia => denuncia.id
    );

    const likes = await Like.findAll({
        where: {
            denunciaId: {
                [Op.in]: ids
            }
        },

        attributes: [
            'denunciaId',
            [
                sequelize.fn(
                    'COUNT',
                    sequelize.col('id')
                ),
                'total'
            ]
        ],

        group: ['denunciaId'],

        raw: true
    });

    const likesMap = likes.reduce(
        (acc, item) => {
            acc[item.denunciaId] =
                Number(item.total);

            return acc;
        },
        {}
    );

    return denuncias.map(denuncia => {
        const dados = denuncia.toJSON();

        return {
            ...dados,
            likesCount:
                likesMap[denuncia.id] || 0
        };
    });
  }

  static async addEngagementStats(denuncias, userId = null) {
    if (!denuncias.length) return [];
    const ids = denuncias.map(denuncia => denuncia.id);
    const countByReport = async model => model.findAll({
      where: { denunciaId: { [Op.in]: ids } },
      attributes: ['denunciaId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['denunciaId'],
      raw: true
    });
    const [likes, shares, comments, ownLikes] = await Promise.all([
      countByReport(Like),
      countByReport(Share),
      countByReport(Comment),
      userId ? Like.findAll({ where: { denunciaId: { [Op.in]: ids }, userId }, attributes: ['denunciaId'], raw: true }) : []
    ]);
    const asMap = rows => Object.fromEntries(rows.map(item => [Number(item.denunciaId), Number(item.total)]));
    const likesMap = asMap(likes);
    const sharesMap = asMap(shares);
    const commentsMap = asMap(comments);
    const likedIds = new Set(ownLikes.map(item => Number(item.denunciaId)));
    return denuncias.map(denuncia => {
      const data = denuncia.toJSON ? denuncia.toJSON() : denuncia;
      return {
        ...data,
        likesCount: likesMap[Number(denuncia.id)] || 0,
        sharesCount: sharesMap[Number(denuncia.id)] || 0,
        commentsCount: commentsMap[Number(denuncia.id)] || 0,
        likedByMe: likedIds.has(Number(denuncia.id))
      };
    });
  }

  static async findOrderedByLikes(
    where,
    page,
    limit,
    userWhere
) {
    const denunciasBase =
        await Denuncia.findAll({
            where,
            attributes: ['id'],
            include: userWhere ? [{ model: User, attributes: [], where: userWhere }] : []
        });

    const ids = denunciasBase.map(
        denuncia => denuncia.id
    );

    const total = ids.length;

    if (!total) {
        return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0
        };
    }

    const likes = await Like.findAll({
        where: {
            denunciaId: {
                [Op.in]: ids
            }
        },

        attributes: [
            'denunciaId',
            [
                sequelize.fn(
                    'COUNT',
                    sequelize.col('id')
                ),
                'total'
            ]
        ],

        group: ['denunciaId'],

        raw: true
    });

    const likesMap = likes.reduce(
        (acc, item) => {
            acc[item.denunciaId] =
                Number(item.total);

            return acc;
        },
        {}
    );

    const idsOrdenados = [...ids].sort(
        (a, b) => {
            const likesA =
                likesMap[a] || 0;

            const likesB =
                likesMap[b] || 0;

            return likesB - likesA;
        }
    );

    const offset =
        (page - 1) * limit;

    const idsDaPagina =
        idsOrdenados.slice(
            offset,
            offset + limit
        );

    if (!idsDaPagina.length) {
        return {
            data: [],
            total,
            page,
            limit,
            totalPages:
                Math.ceil(total / limit)
        };
    }

    const denuncias =
        await Denuncia.findAll({
            where: {
                id: {
                    [Op.in]: idsDaPagina
                }
            },
            attributes: { exclude: ['tituloOriginal', 'descricaoOriginal'] },

            include: [
                {
                    model: User,
                    attributes: [
                        'id',
                        'username',
                        'avatarUrl'
                    ]
                }
            ]
        });

    const denunciasMap = new Map(
        denuncias.map(denuncia => [
            denuncia.id,
            denuncia
        ])
    );

    const ordenadas =
        idsDaPagina
            .map(id =>
                denunciasMap.get(id)
            )
            .filter(Boolean)
            .map(denuncia => ({
                ...denuncia.toJSON(),

                likesCount:
                    likesMap[
                        denuncia.id
                    ] || 0
            }));

    return {
        data: ordenadas,
        total,
        page,
        limit,
        totalPages:
            Math.ceil(total / limit)
    };
  }

  static async findOrderedByShares(where, page, limit, userWhere) {
    const denunciasBase = await Denuncia.findAll({
      where,
      attributes: ['id'],
      include: userWhere ? [{ model: User, attributes: [], where: userWhere }] : []
    });
    const ids = denunciasBase.map(denuncia => denuncia.id);
    const total = ids.length;

    if (!total) return { data: [], total: 0, page, limit, totalPages: 0 };

    const shares = await Share.findAll({
      where: { denunciaId: { [Op.in]: ids } },
      attributes: [
        'denunciaId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      group: ['denunciaId'],
      raw: true
    });
    const sharesMap = shares.reduce((acc, item) => {
      acc[item.denunciaId] = Number(item.total);
      return acc;
    }, {});
    const idsOrdenados = [...ids].sort((a, b) =>
      (sharesMap[b] || 0) - (sharesMap[a] || 0) || Number(b) - Number(a)
    );
    const offset = (page - 1) * limit;
    const idsDaPagina = idsOrdenados.slice(offset, offset + limit);

    if (!idsDaPagina.length) {
      return { data: [], total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    const denuncias = await Denuncia.findAll({
      where: { id: { [Op.in]: idsDaPagina } },
      attributes: { exclude: ['tituloOriginal', 'descricaoOriginal'] },
      include: [{ model: User, attributes: ['id', 'username', 'avatarUrl'] }]
    });
    const denunciasMap = new Map(denuncias.map(denuncia => [denuncia.id, denuncia]));
    const ordenadas = idsDaPagina
      .map(id => denunciasMap.get(id))
      .filter(Boolean)
      .map(denuncia => ({
        ...denuncia.toJSON(),
        sharesCount: sharesMap[denuncia.id] || 0
      }));

    return { data: ordenadas, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async findByUserId(userId) {
    return Denuncia.findAll({
      where: { userId },
      attributes: { exclude: ['tituloOriginal', 'descricaoOriginal'] },
      order: [['createdAt', 'DESC']]
    });
  }

  static async findApprovedByUserId(userId, { page = 1, limit = 12 } = {}) {
    const where = { userId, status: 'aprovada' };
    const offset = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      Denuncia.findAll({ where, attributes: { exclude: ['tituloOriginal', 'descricaoOriginal', 'motivoRejeicao'] }, order: [['createdAt', 'DESC']], limit, offset }),
      Denuncia.count({ where })
    ]);
    const data = await this.addEngagementStats(rows);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async update(id, data) {
    return Denuncia.update(data, { where: { id } });
  }

  static async delete(id) {
    return Denuncia.destroy({ where: { id } });
  }
}

module.exports = DenunciaRepository;
