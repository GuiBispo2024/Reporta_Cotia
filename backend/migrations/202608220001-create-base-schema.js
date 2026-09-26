// Historical baseline: never import current models into this migration.
module.exports = {
  async up(qi, S) {
    const tables = new Set((await qi.showAllTables()).map(table => typeof table === 'string' ? table : table.tableName));
    const id = () => ({ type: S.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false });
    const dates = () => ({ createdAt: { type: S.DATE, allowNull: false }, updatedAt: { type: S.DATE, allowNull: false } });
    const reference = table => ({ type: S.INTEGER, allowNull: true, references: { model: table, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    const definitions = {
      Users: { id: id(), username: { type: S.STRING, allowNull: false, unique: true }, email: { type: S.STRING, allowNull: false, unique: true }, password: { type: S.STRING, allowNull: false }, adm: { type: S.BOOLEAN, defaultValue: false, allowNull: false }, ...dates() },
      Denuncia: { id: id(), titulo: { type: S.STRING(120), allowNull: false }, descricao: { type: S.STRING(2000), allowNull: false }, localizacao: { type: S.STRING(255), allowNull: false }, status: { type: S.ENUM('pendente', 'aprovada', 'rejeitada'), allowNull: false, defaultValue: 'pendente' }, userId: reference('Users'), ...dates() },
      Comentarios: { id: id(), comentario: { type: S.STRING, allowNull: false }, userId: reference('Users'), denunciaId: reference('Denuncia'), ...dates() },
      Likes: { id: id(), userId: reference('Users'), denunciaId: reference('Denuncia'), ...dates() },
      Shares: { id: id(), comentario: { type: S.STRING, allowNull: true }, userId: reference('Users'), denunciaId: reference('Denuncia'), ...dates() }
    };
    await qi.sequelize.transaction(async transaction => {
      for (const [table, definition] of Object.entries(definitions)) {
        if (!tables.has(table)) await qi.createTable(table, definition, { transaction });
      }
    });
  },
  async down() {
    throw new Error('Baseline rollback is intentionally blocked: it may contain pre-existing civic records.');
  }
};
