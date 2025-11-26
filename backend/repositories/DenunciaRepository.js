const { Denuncia, User, Like, sequelize} = require('../models/rel')
const { Op } = require("sequelize");

class DenunciaRepository {

    //Configuração base para consultas com contagem de likes
    static baseQueryConfig(order) {
        return {
            include: [
                { model: User, attributes: ["id", "username"] },
                { model: Like, attributes: [] }
            ],
            attributes: {
                include: [
                    [sequelize.fn("COUNT", sequelize.col("Likes.id")), "likesCount"]
                ]
            },
            group: ["Denuncia.id", "User.id"],
            order
        };
    }

    //Configuração base para consultas com filtros e contagem de likes para username
    static baseQueryConfigFiltered(order, userWhere=null) {
        return {
            include: [
                { model: User, attributes: ["username"], ...(userWhere ? { where: userWhere } : {})}, 
                { model: Like, attributes: [] }
            ],
            attributes: {
                include: [
                    [sequelize.fn("COUNT", sequelize.col("Likes.id")), "likesCount"]
            ]
            },
            group: ["Denuncia.id", "User.id"],
            order
        };
    }

    //Cria uma denúncia
    static async create(data) {
        return Denuncia.create(data)
    }

    //Busca uma denúncia específica
    static async findById(id) {
        return Denuncia.findByPk(id, {
        include: { model: User, attributes: ['id','username'] }
        })
    }

    //Lista todas as Denúncias
    static async findAll() {
        const order = [[sequelize.literal('COUNT("Likes"."id")'), "DESC"]];
        return Denuncia.findAll(this.baseQueryConfig(order));
    }

    //Lista denúncias com filtros
    static async findWithFilters({ titulo, descricao, localizacao, user, sort }) {
        const where = {};

        if (titulo) where.titulo = { [Op.iLike]: `%${titulo}%` };
        if (descricao) where.descricao = { [Op.iLike]: `%${descricao}%` };
        if (localizacao) where.localizacao = { [Op.iLike]: `%${localizacao}%` };
        let userWhere = null;
        if (user){
            userWhere = { 
                username: { [Op.iLike]: `%${user}%` } 
            }
        }

        const order =
            sort === "likes"
                ? [[sequelize.literal('COUNT("Likes"."id")'), "DESC"]]
                : [["createdAt", "DESC"]];

        return Denuncia.findAll({
            where,
            ...this.baseQueryConfigFiltered(order, userWhere)
        });
    }

    //Busca todas as denúncias de um usuário específico
    static async findByUserId(userId) {
        return Denuncia.findAll({ where: { userId } })
    }

    //Altera uma denúncia
    static async update(id, data) {
        return Denuncia.update(data, { where: { id } })
    }

    //Deleta uma denúncia
    static async delete(id) {
        return Denuncia.destroy({ where: { id } })
    }
}

module.exports = DenunciaRepository