'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query(
        'DELETE FROM "Likes" WHERE "denunciaId" IN (SELECT "id" FROM "Denuncia" WHERE "status" <> \'aprovada\')',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DELETE FROM "Shares" WHERE "denunciaId" IN (SELECT "id" FROM "Denuncia" WHERE "status" <> \'aprovada\')',
        { transaction }
      );
    });
  },

  async down() {
    // Os registros removidos não podem ser reconstruídos sem inventar dados históricos.
  }
};
