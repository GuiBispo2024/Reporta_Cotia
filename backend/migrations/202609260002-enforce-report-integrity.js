module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async transaction => {
      const query = sql => qi.sequelize.query(sql, { transaction });
      await query('UPDATE "Denuncia" SET "status" = \'pendente\' WHERE "status" IS NULL');
      if (qi.sequelize.getDialect() === 'postgres') {
        await query('ALTER TABLE "Denuncia" ALTER COLUMN "status" SET NOT NULL');
        // Drop only redundant generated constraints with an identical canonical
        // definition and no foreign key depending on the redundant index.
        const [duplicates] = await query(`SELECT extra.conname FROM pg_constraint extra
          JOIN pg_constraint canonical ON canonical.conrelid = extra.conrelid
            AND canonical.conkey = extra.conkey AND canonical.contype = 'u'
          WHERE extra.conrelid = '"Users"'::regclass AND extra.contype = 'u'
            AND canonical.conname IN ('Users_username_key', 'Users_email_key')
            AND extra.conname ~ '^Users_(username|email)_key[0-9]+$'
            AND NOT EXISTS (SELECT 1 FROM pg_constraint fk WHERE fk.contype = 'f' AND fk.conindid = extra.conindid)`);
        for (const { conname } of duplicates) await qi.removeConstraint('Users', conname, { transaction });
      } else {
        await qi.changeColumn('Denuncia', 'status', { type: S.STRING, allowNull: false, defaultValue: 'pendente' }, { transaction });
      }
      await query('DELETE FROM "Likes" WHERE "id" NOT IN (SELECT MIN("id") FROM "Likes" GROUP BY "userId", "denunciaId")');
      const indices = await qi.showIndex('Likes', { transaction });
      if (!indices.some(index => index.name === 'likes_user_report_unique')) {
        await qi.addIndex('Likes', ['userId', 'denunciaId'], { name: 'likes_user_report_unique', unique: true, transaction });
      }
    });
  },
  async down(qi) {
    await qi.removeIndex('Likes', 'likes_user_report_unique');
    // Retain NOT NULL and avoid recreating duplicate indexes or duplicate likes.
  }
};
