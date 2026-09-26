// Only recover the exact legacy form format. Ambiguous addresses stay flagged
// for manual correction instead of receiving an inferred neighborhood.
const normalized = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
module.exports = {
  async up(qi, S) {
    await qi.sequelize.transaction(async transaction => {
      const rows = await qi.sequelize.query(
        'SELECT "id", "localizacao" FROM "Denuncia" WHERE "bairro" IS NULL OR TRIM("bairro") = \'\'',
        { type: S.QueryTypes.SELECT, transaction }
      );
      for (const row of rows) {
        const parts = (row.localizacao || '').split(' - ').map(value => value.trim());
        if (parts.length !== 4 || !parts[1] || parts[1].length > 120
          || normalized(parts[2]) !== 'cotia' || !['sp', 'sao paulo'].includes(normalized(parts[3]))) continue;
        await qi.bulkUpdate('Denuncia', { bairro: parts[1] }, {
          id: row.id, localizacao: row.localizacao,
          [S.Op.or]: [{ bairro: null }, S.where(S.fn('TRIM', S.col('bairro')), '')]
        }, { transaction });
      }
    });
  },
  async down() {
    // Preserve repaired source data; reversing would recreate missing values.
  }
};
